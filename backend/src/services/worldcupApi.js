import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.WORLDCUP_API_URL || 'http://worldcup26.ir:3050';
const TIMEOUT_MS = Number(process.env.WORLDCUP_API_TIMEOUT_MS) || 25000;
const CACHE_TTL_MS = Number(process.env.WORLDCUP_CACHE_TTL_MS) || 5 * 60 * 1000;

const cache = new Map();

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw Object.assign(new Error(`World Cup API error ${response.status}: ${body.slice(0, 120)}`), {
      status: response.status,
    });
  }

  return response.json();
}

function getCached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Promise.resolve(hit.data);
  }

  return loader().then((data) => {
    cache.set(key, { at: Date.now(), data });
    return data;
  });
}

export function clearWorldcupCache() {
  cache.clear();
}

export async function getTeams() {
  return getCached('teams', async () => {
    const data = await fetchJson('/get/teams');
    return data.teams || [];
  });
}

export async function getTeamByName(name) {
  const encoded = encodeURIComponent(name);
  return getCached(`team:${name}`, () => fetchJson(`/get/team?name=${encoded}`));
}

export async function getGames() {
  return getCached('games', async () => {
    const data = await fetchJson('/get/games');
    return data.games || [];
  });
}

export async function getGroups() {
  return getCached('groups', async () => {
    const data = await fetchJson('/get/groups');
    return data.groups || [];
  });
}

export async function getStadiums() {
  return getCached('stadiums', async () => {
    const data = await fetchJson('/get/stadiums');
    return data.stadiums || [];
  });
}

export async function getHealth() {
  return fetchJson('/health');
}

export { BASE_URL };
