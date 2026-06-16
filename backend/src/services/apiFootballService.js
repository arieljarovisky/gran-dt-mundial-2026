import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID) || 1; // FIFA World Cup
const SEASON = Number(process.env.API_FOOTBALL_SEASON) || 2026;

// Matchday number → API-Football round name (WC 2026 format)
const MATCHDAY_ROUNDS = {
  1: ['Group Stage - 1'],
  2: ['Group Stage - 2'],
  3: ['Group Stage - 3'],
  4: ['Round of 32'],
  5: ['Round of 16'],
  6: ['Quarter-finals'],
  7: ['Semi-finals'],
  8: ['3rd Place Final', 'Final'],
};

// FIFA code → API-Football national team ID
// Verify IDs at: https://www.api-football.com/documentation-v3#tag/Teams
export const TEAM_IDS = {
  ALG: 4,   ARG: 26,  AUS: 25,  AUT: 44,  BEL: 1,   BIH: 21,
  BRA: 6,   CAN: 94,  CIV: 40,  COD: 62,  COL: 30,  CPV: 98,
  CRO: 3,   CUW: 164, CZE: 48,  ECU: 31,  EGY: 5,   ENG: 10,
  ESP: 9,   FRA: 2,   GER: 25,  GHA: 22,  HAI: 97,  IRN: 41,
  IRQ: 42,  JOR: 43,  JPN: 29,  KOR: 149, KSA: 36,  MAR: 32,
  MEX: 16,  NED: 3,   NOR: 45,  NZL: 142, PAN: 100, PAR: 37,
  POR: 27,  QAT: 35,  RSA: 54,  SCO: 8,   SEN: 33,  SUI: 15,
  SWE: 13,  TUN: 38,  TUR: 20,  URU: 28,  USA: 17,  UZB: 174,
};

// Reverse map: API-Football team ID → FIFA code (first match wins)
const API_ID_TO_CODE = new Map();
for (const [code, id] of Object.entries(TEAM_IDS)) {
  if (!API_ID_TO_CODE.has(id)) API_ID_TO_CODE.set(id, code);
}

// In-memory fixtures cache (5 min TTL — refreshes to catch new finished games)
let fixturesCache = null;
let fixturesCachedAt = 0;
const FIXTURES_TTL_MS = 5 * 60 * 1000;

// File-based events cache (persists between restarts to save API quota)
const EVENTS_CACHE_FILE = path.join(__dirname, '../db/apifootball-events-cache.json');
let eventsCache = null;

function loadEventsCache() {
  if (eventsCache) return eventsCache;
  try {
    eventsCache = fs.existsSync(EVENTS_CACHE_FILE)
      ? JSON.parse(fs.readFileSync(EVENTS_CACHE_FILE, 'utf8'))
      : {};
  } catch {
    eventsCache = {};
  }
  return eventsCache;
}

function saveEventsCache() {
  try {
    fs.writeFileSync(EVENTS_CACHE_FILE, JSON.stringify(eventsCache, null, 2), 'utf8');
  } catch { /* non-fatal */ }
}

async function apiFetch(endpoint) {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY no está configurado en el entorno');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${endpoint}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length && !Array.isArray(json.errors)) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

async function getAllFixtures() {
  if (fixturesCache && Date.now() - fixturesCachedAt < FIXTURES_TTL_MS) {
    return fixturesCache;
  }
  const data = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  fixturesCache = data;
  fixturesCachedAt = Date.now();
  return data;
}

async function getFixtureEvents(fixtureId) {
  const cache = loadEventsCache();
  if (cache[fixtureId]) return cache[fixtureId];

  const events = await apiFetch(`/fixtures/events?fixture=${fixtureId}`);
  cache[fixtureId] = events;
  eventsCache = cache;
  saveEventsCache();
  return events;
}

/**
 * Returns finished games for a matchday, with processed events.
 * Each game: { homeCode, awayCode, homeScore, awayScore, events: [{type, playerName, teamCode}] }
 */
export async function getMatchdayGames(matchday) {
  const rounds = MATCHDAY_ROUNDS[matchday];
  if (!rounds) return [];

  const allFixtures = await getAllFixtures();
  const matchdayFixtures = allFixtures.filter(
    (f) => rounds.includes(f.league?.round) && f.fixture?.status?.short === 'FT'
  );

  const games = [];
  for (const fixture of matchdayFixtures) {
    const homeApiId = fixture.teams?.home?.id;
    const awayApiId = fixture.teams?.away?.id;

    let rawEvents = [];
    try {
      rawEvents = await getFixtureEvents(fixture.fixture.id);
    } catch (err) {
      console.error(`[apiFootball] Error fetching events for fixture ${fixture.fixture.id}:`, err.message);
    }

    const events = rawEvents
      .filter((e) => (e.type === 'Goal' && e.detail !== 'Own Goal') || e.type === 'Card')
      .map((e) => {
        let type;
        if (e.type === 'Goal') type = 'goal';
        else if (e.detail === 'Yellow Card') type = 'yellow_card';
        else type = 'red_card'; // Red Card or Second Yellow Card
        return {
          type,
          playerName: e.player?.name ?? '',
          teamApiId: e.team?.id,
          teamCode: API_ID_TO_CODE.get(e.team?.id) ?? null,
        };
      });

    games.push({
      fixtureId: fixture.fixture.id,
      homeApiId,
      awayApiId,
      homeCode: API_ID_TO_CODE.get(homeApiId) ?? null,
      awayCode: API_ID_TO_CODE.get(awayApiId) ?? null,
      homeScore: fixture.goals?.home ?? 0,
      awayScore: fixture.goals?.away ?? 0,
      events,
    });
  }

  return games;
}
