import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTeams } from './worldcupApi.js';
import { getFlagApiPath, getFlagCdnUrl } from '../utils/flagUrls.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQUAD_FILE = path.join(__dirname, '../db/players-parsed.json');

function loadSquadFromPdf() {
  const raw = fs.readFileSync(SQUAD_FILE, 'utf8');
  return JSON.parse(raw);
}

function enrichWithApiData(squadPlayers, teams) {
  const teamByCode = new Map(teams.map((t) => [t.fifa_code, t]));

  return squadPlayers.map((player) => {
    const team = teamByCode.get(player.teamCode);

    return {
      id: player.id,
      name: player.name,
      shirtName: player.shirtName ?? player.name,
      country: team?.name_en || player.country,
      teamCode: player.teamCode,
      position: player.position,
      price: player.price,
      points: player.points ?? 0,
      flag: getFlagApiPath(player.teamCode) || team?.flag || getFlagCdnUrl(player.teamCode),
      teamId: team?.id ?? null,
      group: team?.groups ?? null,
      club: player.club ?? null,
    };
  });
}

export async function buildPlayersCatalog() {
  const squadPlayers = loadSquadFromPdf();

  try {
    const teams = await getTeams();
    return enrichWithApiData(squadPlayers, teams);
  } catch {
    return squadPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      shirtName: player.shirtName ?? player.name,
      country: player.country,
      teamCode: player.teamCode,
      position: player.position,
      price: player.price,
      points: player.points ?? 0,
      flag: getFlagApiPath(player.teamCode) || getFlagCdnUrl(player.teamCode),
      club: player.club ?? null,
    }));
  }
}

let playersCache = null;
let playersCacheAt = 0;
const PLAYERS_TTL_MS = Number(process.env.WORLDCUP_CACHE_TTL_MS) || 5 * 60 * 1000;

export async function getAllPlayers() {
  if (playersCache && Date.now() - playersCacheAt < PLAYERS_TTL_MS) {
    return playersCache;
  }

  playersCache = await buildPlayersCatalog();
  playersCacheAt = Date.now();
  return playersCache;
}

export async function getPlayerById(playerId) {
  const players = await getAllPlayers();
  return players.find((p) => p.id === playerId) || null;
}

export function invalidatePlayersCache() {
  playersCache = null;
  playersCacheAt = 0;
}
