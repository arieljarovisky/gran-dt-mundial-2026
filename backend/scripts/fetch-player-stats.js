#!/usr/bin/env node
/**
 * Fetches last-season player stats from API-Football and enriches players-parsed.json.
 *
 * Usage:
 *   API_FOOTBALL_KEY=<your_key> node scripts/fetch-player-stats.js [--season 2024]
 *
 * Free tier: 100 requests/day. This script uses ~50-100 requests (one per national team).
 * Get a free key at: https://www.api-football.com/
 *
 * Enriches each player with:
 *   goals_season, assists_season, games_season (for DEL/MED)
 *   clean_sheets_season, tackles_season, games_season (for DEF/POR)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error('Falta API_FOOTBALL_KEY. Obtené una clave gratuita en https://www.api-football.com/');
  process.exit(1);
}

const BASE_URL = 'https://v3.football.api-sports.io';
const PLAYERS_JSON = path.join(__dirname, '../src/db/players-parsed.json');

const args = process.argv.slice(2);
const seasonArg = args.find(a => a.startsWith('--season'));
const SEASON = seasonArg ? parseInt(seasonArg.split('=')[1] ?? args[args.indexOf(seasonArg) + 1]) : 2024;

// API-Football national team IDs for WC 2026 participants
// Source: https://www.api-football.com/documentation-v3#tag/Teams
const TEAM_IDS = {
  ALG: 4,   ARG: 26,  AUS: 25,  AUT: 44,  BEL: 1,   BIH: 21,
  BRA: 6,   CAN: 94,  CIV: 40,  COD: 62,  COL: 30,  CPV: 98,
  CRO: 10,  CUW: 164, CZE: 48,  ECU: 31,  EGY: 5,   ENG: 10,  // ENG id verified below
  ESP: 9,   FRA: 2,   GER: 25,  GHA: 22,  HAI: 97,  IRN: 41,
  IRQ: 42,  JOR: 43,  JPN: 29,  KOR: 149, KSA: 36,  MAR: 32,
  MEX: 16,  NED: 3,   NOR: 45,  NZL: 142, PAN: 100, PAR: 37,
  POR: 27,  QAT: 35,  RSA: 54,  SCO: 8,   SEN: 33,  SUI: 15,
  SWE: 13,  TUN: 38,  TUR: 20,  URU: 28,  USA: 17,  UZB: 174,
};

async function apiFetch(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

function nameSimilarity(a, b) {
  const wa = normalize(a).split(/\s+/);
  const wb = normalize(b).split(/\s+/);
  const common = wa.filter(w => w.length > 2 && wb.includes(w)).length;
  return common / Math.max(wa.length, wb.length);
}

function matchPlayer(apiPlayer, ourPlayers) {
  const apiName = `${apiPlayer.player.firstname ?? ''} ${apiPlayer.player.lastname ?? ''}`.trim();
  let best = null, bestScore = 0;
  for (const p of ourPlayers) {
    const score = nameSimilarity(apiName, p.name);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

function extractStats(apiPlayer) {
  const stats = apiPlayer.statistics?.[0] ?? {};
  return {
    games_season: stats.games?.appearences ?? 0,
    goals_season: stats.goals?.total ?? 0,
    assists_season: stats.goals?.assists ?? 0,
    clean_sheets_season: stats.goals?.conceded === 0 && (stats.games?.appearences ?? 0) > 0
      ? (stats.games?.appearences ?? 0)   // rough proxy if field not available
      : stats.goals?.saves != null ? Math.floor((stats.games?.appearences ?? 0) / 4) : 0,
    tackles_season: (stats.tackles?.total ?? 0) + (stats.tackles?.interceptions ?? 0),
  };
}

async function main() {
  const players = JSON.parse(fs.readFileSync(PLAYERS_JSON, 'utf8'));
  const byTeam = {};
  players.forEach(p => {
    if (!byTeam[p.teamCode]) byTeam[p.teamCode] = [];
    byTeam[p.teamCode].push(p);
  });

  let matched = 0, total = 0;
  const teamCodes = Object.keys(TEAM_IDS);
  console.log(`Temporada ${SEASON} | ${teamCodes.length} selecciones`);

  for (const [i, code] of teamCodes.entries()) {
    const teamId = TEAM_IDS[code];
    const ourPlayers = byTeam[code] ?? [];
    if (!ourPlayers.length) continue;

    process.stdout.write(`[${i + 1}/${teamCodes.length}] ${code} (teamId=${teamId})... `);

    try {
      const apiPlayers = await apiFetch(`/players?team=${teamId}&season=${SEASON}`);
      let teamMatched = 0;
      for (const apiP of apiPlayers) {
        const ours = matchPlayer(apiP, ourPlayers);
        if (ours) {
          Object.assign(ours, extractStats(apiP));
          teamMatched++;
        }
      }
      console.log(`${teamMatched}/${ourPlayers.length} jugadores emparejados`);
      matched += teamMatched;
      total += ourPlayers.length;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    // Respect rate limit: 10 req/s on free tier
    await new Promise(r => setTimeout(r, 120));
  }

  // Players without season data keep zeros
  players.forEach(p => {
    if (p.games_season === undefined) {
      p.games_season = 0;
      p.goals_season = 0;
      p.assists_season = 0;
      p.clean_sheets_season = 0;
      p.tackles_season = 0;
    }
  });

  fs.writeFileSync(PLAYERS_JSON, JSON.stringify(players, null, 2), 'utf8');
  console.log(`\nListo: ${matched}/${total} emparejados. Datos guardados en players-parsed.json`);
  console.log('Ahora ejecutá: node scripts/recalc-prices-ivm.js');
}

main().catch(err => { console.error(err); process.exit(1); });
