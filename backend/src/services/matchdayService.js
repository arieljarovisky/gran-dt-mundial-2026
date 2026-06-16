import dotenv from 'dotenv';
import { getGames } from './worldcupApi.js';

dotenv.config();

const LOCK_HOURS_BEFORE = 1;
export const ACTIVE_MATCHDAY = Number(process.env.CURRENT_MATCHDAY) || 2;

function parseLocalDate(localDate) {
  const [datePart, timePart] = localDate.trim().split(/\s+/);
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function groupGamesByMatchday(games) {
  const map = new Map();

  for (const game of games) {
    const md = Number(game.matchday);
    if (!map.has(md)) map.set(md, []);
    map.get(md).push(game);
  }

  return map;
}

export async function getMatchdaySchedule() {
  const games = await getGames();
  const grouped = groupGamesByMatchday(games);
  const matchdays = [];

  for (const [matchday, mdGames] of grouped.entries()) {
    const kickoffs = mdGames
      .map((g) => parseLocalDate(g.local_date))
      .sort((a, b) => a - b);

    const firstKickoff = kickoffs[0];
    const lockDeadline = new Date(firstKickoff.getTime() - LOCK_HOURS_BEFORE * 60 * 60 * 1000);
    const allFinished = mdGames.every((g) => g.finished === 'TRUE');
    const now = new Date();

    matchdays.push({
      matchday,
      firstKickoff: firstKickoff.toISOString(),
      lockDeadline: lockDeadline.toISOString(),
      isLocked: now >= lockDeadline,
      isFinished: allFinished,
      gamesCount: mdGames.length,
      finishedCount: mdGames.filter((g) => g.finished === 'TRUE').length,
    });
  }

  return matchdays.sort((a, b) => a.matchday - b.matchday);
}

export async function getMatchdayInfo(matchday = ACTIVE_MATCHDAY) {
  const schedule = await getMatchdaySchedule();
  const info = schedule.find((m) => m.matchday === matchday);

  if (!info) {
    throw Object.assign(new Error(`Fecha ${matchday} no encontrada.`), { status: 404 });
  }

  const now = new Date();
  const lockAt = new Date(info.lockDeadline);
  const msUntilLock = lockAt.getTime() - now.getTime();

  return {
    ...info,
    activeMatchday: ACTIVE_MATCHDAY,
    canEditSquad: !info.isLocked && matchday === ACTIVE_MATCHDAY,
    msUntilLock: Math.max(0, msUntilLock),
  };
}

export async function assertSquadEditable() {
  const info = await getMatchdayInfo(ACTIVE_MATCHDAY);

  if (info.isLocked) {
    throw Object.assign(
      new Error(
        `La plantilla está cerrada para la Fecha ${ACTIVE_MATCHDAY}. El cierre fue 1 hora antes del primer partido.`
      ),
      { status: 403, code: 'SQUAD_LOCKED' }
    );
  }
}

export async function getGamesForMatchday(matchday) {
  const games = await getGames();
  return games.filter((g) => Number(g.matchday) === Number(matchday));
}

export async function getScoringMatchdays() {
  const schedule = await getMatchdaySchedule();
  return schedule.filter((m) => m.matchday >= ACTIVE_MATCHDAY);
}
