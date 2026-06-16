#!/usr/bin/env node
/**
 * Fetches last-season player stats from Sofascore (unofficial API, no key needed).
 * Run this locally — remote environments block outbound traffic to sofascore.com.
 *
 * Usage:
 *   node scripts/fetch-sofascore-stats.js
 *
 * What it does:
 *   1. For each player in players-parsed.json, searches Sofascore by name
 *   2. Fetches their last-season stats (goals, assists, games, clean sheets, tackles)
 *   3. Saves results to src/db/sofascore-cache.json (resumable if interrupted)
 *   4. Enriches players-parsed.json with *_season fields
 *
 * After running this, execute: node scripts/recalc-prices-ivm.js
 *
 * Takes ~15-20 min for all 1248 players (respectful rate limiting).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_JSON = path.join(__dirname, '../src/db/players-parsed.json');
const CACHE_JSON   = path.join(__dirname, '../src/db/sofascore-cache.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.sofascore.com/',
};
const DELAY_MS = 400; // gentle rate limit

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function nameSimilarity(a, b) {
  const wa = normalize(a).split(' ').filter(w => w.length > 2);
  const wb = normalize(b).split(' ').filter(w => w.length > 2);
  const common = wa.filter(w => wb.includes(w)).length;
  return wa.length + wb.length === 0 ? 0 : (2 * common) / (wa.length + wb.length);
}

async function sofaFetch(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429) {
    process.stdout.write(' [rate-limited, waiting 5s]');
    await sleep(5000);
    return sofaFetch(url);
  }
  if (!res.ok) return null;
  return res.json();
}

async function searchPlayer(name) {
  const q = encodeURIComponent(normalize(name).split(' ').slice(-2).join(' '));
  const data = await sofaFetch(`https://api.sofascore.com/api/v1/search/players?q=${q}`);
  return data?.players ?? [];
}

async function getPlayerStats(playerId) {
  // Get available seasons
  const seasons = await sofaFetch(`https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`);
  if (!seasons?.uniqueTournamentSeasons?.length) return null;

  // Pick the most recent completed season (not current ongoing one if possible)
  const allSeasons = seasons.uniqueTournamentSeasons
    .flatMap(t => t.seasons.map(s => ({ ...s, tournamentName: t.uniqueTournament?.name ?? '' })))
    .filter(s => !s.tournamentName.toLowerCase().includes('youth'))
    .sort((a, b) => b.year - a.year);

  if (!allSeasons.length) return null;
  const season = allSeasons[0];

  await sleep(DELAY_MS);
  const stats = await sofaFetch(
    `https://api.sofascore.com/api/v1/player/${playerId}/statistics/season/${season.id}`
  );

  const s = stats?.statistics;
  if (!s) return null;

  return {
    goals_season:        s.goals ?? 0,
    assists_season:      s.goalAssist ?? 0,
    games_season:        s.appearances ?? s.minutesPlayed ? Math.round((s.minutesPlayed ?? 0) / 90) : 0,
    clean_sheets_season: s.cleanSheet ?? 0,
    tackles_season:      (s.tackles ?? 0) + (s.interceptions ?? 0),
  };
}

async function main() {
  const players = JSON.parse(fs.readFileSync(PLAYERS_JSON, 'utf8'));

  // Load existing cache (allows resuming)
  const cache = fs.existsSync(CACHE_JSON)
    ? JSON.parse(fs.readFileSync(CACHE_JSON, 'utf8'))
    : {};

  const todo = players.filter(p => !cache[p.id]);
  console.log(`Total: ${players.length} | Ya cacheados: ${players.length - todo.length} | Pendientes: ${todo.length}`);
  console.log('Esto puede tardar ~15-20 minutos. Podés interrumpirlo y retomarlo.\n');

  let matched = 0, failed = 0;

  for (const [i, player] of todo.entries()) {
    process.stdout.write(`[${i + 1}/${todo.length}] ${player.name.padEnd(40).slice(0, 40)}... `);

    try {
      await sleep(DELAY_MS);
      const results = await searchPlayer(player.name);

      // Find best match by name + country
      let best = null, bestScore = 0;
      for (const r of results.slice(0, 5)) {
        const nameScore = nameSimilarity(player.name, `${r.player?.name ?? ''} ${r.player?.shortName ?? ''}`);
        const countryCode = r.player?.nationality?.alpha3 ?? r.player?.country?.alpha3 ?? '';
        const countryBonus = countryCode.toLowerCase() === player.teamCode.toLowerCase() ? 0.2 : 0;
        const score = nameScore + countryBonus;
        if (score > bestScore && score > 0.4) { bestScore = score; best = r; }
      }

      if (!best) {
        cache[player.id] = { error: 'not_found' };
        console.log('no encontrado');
        failed++;
      } else {
        const sofaId = best.player.id;
        await sleep(DELAY_MS);
        const stats = await getPlayerStats(sofaId);
        if (stats) {
          cache[player.id] = { sofaId, ...stats };
          matched++;
          const { goals_season: g, assists_season: a, games_season: gm } = stats;
          console.log(`✓ (${gm} partidos, ${g}g, ${a}a)`);
        } else {
          cache[player.id] = { sofaId, error: 'no_stats' };
          console.log('sin stats');
          failed++;
        }
      }
    } catch (err) {
      cache[player.id] = { error: err.message };
      console.log(`ERROR: ${err.message.slice(0, 50)}`);
      failed++;
    }

    // Save cache every 20 players
    if ((i + 1) % 20 === 0) {
      fs.writeFileSync(CACHE_JSON, JSON.stringify(cache, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(CACHE_JSON, JSON.stringify(cache, null, 2), 'utf8');

  // Enrich players-parsed.json
  let enriched = 0;
  for (const p of players) {
    const c = cache[p.id];
    if (c && !c.error) {
      p.goals_season        = c.goals_season ?? 0;
      p.assists_season      = c.assists_season ?? 0;
      p.games_season        = c.games_season ?? 0;
      p.clean_sheets_season = c.clean_sheets_season ?? 0;
      p.tackles_season      = c.tackles_season ?? 0;
      enriched++;
    }
  }

  fs.writeFileSync(PLAYERS_JSON, JSON.stringify(players, null, 2), 'utf8');

  console.log(`\n✅ Listo: ${matched} emparejados, ${failed} fallidos, ${enriched} enriquecidos`);
  console.log('Ejecutá ahora: node scripts/recalc-prices-ivm.js');
}

main().catch(err => { console.error(err); process.exit(1); });
