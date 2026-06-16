import pool from '../db/connection.js';
import { getAllPlayers } from './playersBuilder.js';
import { TEAM_IDS, getMatchdayGames } from './apiFootballService.js';
import { ACTIVE_MATCHDAY, getMatchdaySchedule } from './matchdayService.js';
import { ensureTeam } from './teamService.js';

const GOAL_POINTS = { POR: 6, DEF: 6, MED: 5, DEL: 4 };
const CLEAN_SHEET_POINTS = { POR: 4, DEF: 4 };
const APPEARANCE_POINTS = 1;
const YELLOW_CARD_POINTS = -1;
const RED_CARD_POINTS = -3;

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name) {
  return normalize(name).split(' ').filter(Boolean);
}

export function scorerMatchesPlayer(scorer, playerName) {
  const sTok = tokens(scorer);
  const pTok = tokens(playerName);
  if (!sTok.length || !pTok.length) return false;

  const sLast = sTok[sTok.length - 1];
  const pLast = pTok[pTok.length - 1];

  if (sLast === pLast) return true;
  if (sLast.length >= 4 && pLast.startsWith(sLast)) return true;
  if (pLast.length >= 4 && sLast.startsWith(pLast)) return true;

  const sInitial = sTok[0].charAt(0);
  const pInitial = pTok[0].charAt(0);
  if (sInitial === pInitial && sLast === pLast) return true;

  return sTok.some((st) => pTok.some((pt) => pt.length > 3 && st.length > 3 && (pt === st || pt.includes(st) || st.includes(pt))));
}


async function getLiveSquad(userId) {
  await ensureTeam(userId);
  const [rows] = await pool.query(
    'SELECT slot_id, position, player_id FROM team_slots WHERE user_id = ?',
    [userId]
  );
  return rows;
}

export async function ensureSquadSnapshot(userId, matchday) {
  const [existing] = await pool.query(
    'SELECT slot_id FROM matchday_squads WHERE user_id = ? AND matchday = ? LIMIT 1',
    [userId, matchday]
  );

  if (existing.length > 0) return;

  const squad = await getLiveSquad(userId);
  const now = new Date();

  for (const slot of squad) {
    await pool.query(
      `INSERT INTO matchday_squads (user_id, matchday, slot_id, position, player_id, locked_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, matchday, slot.slot_id, slot.position, slot.player_id, now]
    );
  }
}

export async function getSquadForMatchday(userId, matchday, { isLocked }) {
  if (isLocked) {
    await ensureSquadSnapshot(userId, matchday);
    const [rows] = await pool.query(
      'SELECT slot_id, position, player_id FROM matchday_squads WHERE user_id = ? AND matchday = ?',
      [userId, matchday]
    );
    if (rows.length > 0) return rows;
  }

  return getLiveSquad(userId);
}

export async function calculateMatchdayPoints(userId, matchday, { isLocked, isFinished }) {
  if (matchday < ACTIVE_MATCHDAY) {
    return { matchday, points: 0, breakdown: [], cached: true };
  }

  const [[cached]] = await pool.query(
    'SELECT points, breakdown FROM matchday_scores WHERE user_id = ? AND matchday = ?',
    [userId, matchday]
  );

  if (cached && isFinished) {
    return {
      matchday,
      points: cached.points,
      breakdown: JSON.parse(cached.breakdown || '[]'),
      cached: true,
    };
  }

  const squadRows = await getSquadForMatchday(userId, matchday, { isLocked });
  const allPlayers = await getAllPlayers();
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const squad = squadRows
    .filter((r) => r.player_id)
    .map((r) => ({ ...r, player: playerMap.get(r.player_id) }))
    .filter((r) => r.player);

  let games = [];
  try {
    games = await getMatchdayGames(matchday);
  } catch (err) {
    console.error('[scoring] Error fetching API-Football games:', err.message);
  }

  const breakdown = [];
  let total = 0;

  for (const slot of squad) {
    const player = slot.player;
    const playerTeamApiId = TEAM_IDS[player.teamCode];
    let playerPoints = 0;
    const events = [];

    for (const game of games) {
      const isHome = game.homeApiId === playerTeamApiId;
      const isAway = game.awayApiId === playerTeamApiId;
      if (!isHome && !isAway) continue;

      events.push({ type: 'appearance', points: APPEARANCE_POINTS });
      playerPoints += APPEARANCE_POINTS;

      const goalEvents = game.events.filter(
        (e) => e.type === 'goal' && e.teamApiId === playerTeamApiId && scorerMatchesPlayer(e.playerName, player.name)
      );
      if (goalEvents.length > 0) {
        const pts = goalEvents.length * GOAL_POINTS[player.position];
        playerPoints += pts;
        events.push({ type: 'goal', count: goalEvents.length, points: pts });
      }

      const conceded = isHome ? game.awayScore : game.homeScore;
      if (conceded === 0 && CLEAN_SHEET_POINTS[player.position]) {
        playerPoints += CLEAN_SHEET_POINTS[player.position];
        events.push({ type: 'clean_sheet', points: CLEAN_SHEET_POINTS[player.position] });
      } else if (player.position === 'POR' && conceded > 0) {
        playerPoints += -conceded;
        events.push({ type: 'goals_conceded', count: conceded, points: -conceded });
      }

      const yellowCount = game.events.filter(
        (e) => e.type === 'yellow_card' && e.teamApiId === playerTeamApiId && scorerMatchesPlayer(e.playerName, player.name)
      ).length;
      if (yellowCount > 0) {
        const pts = yellowCount * YELLOW_CARD_POINTS;
        playerPoints += pts;
        events.push({ type: 'yellow_card', count: yellowCount, points: pts });
      }

      const redCount = game.events.filter(
        (e) => e.type === 'red_card' && e.teamApiId === playerTeamApiId && scorerMatchesPlayer(e.playerName, player.name)
      ).length;
      if (redCount > 0) {
        const pts = redCount * RED_CARD_POINTS;
        playerPoints += pts;
        events.push({ type: 'red_card', count: redCount, points: pts });
      }
    }

    if (playerPoints !== 0 || events.length > 0) {
      breakdown.push({
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        points: playerPoints,
        events,
      });
      total += playerPoints;
    }
  }

  if (isFinished || isLocked) {
    await pool.query(
      `INSERT INTO matchday_scores (user_id, matchday, points, breakdown)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE points = VALUES(points), breakdown = VALUES(breakdown), calculated_at = CURRENT_TIMESTAMP`,
      [userId, matchday, total, JSON.stringify(breakdown)]
    );
  }

  return { matchday, points: total, breakdown, cached: false };
}

export async function getUserStandings(userId) {
  const schedule = await getMatchdaySchedule();
  const scoringDays = schedule.filter((m) => m.matchday >= ACTIVE_MATCHDAY);

  const matchdays = [];
  let totalPoints = 0;

  for (const md of scoringDays) {
    if (md.isLocked) {
      await ensureSquadSnapshot(userId, md.matchday);
    }

    const result = await calculateMatchdayPoints(userId, md.matchday, {
      isLocked: md.isLocked,
      isFinished: md.isFinished,
    });

    matchdays.push(result);
    totalPoints += result.points;
  }

  return { totalPoints, matchdays };
}

export async function getTournamentStandings(tournamentId) {
  const [members] = await pool.query(
    'SELECT user_id, display_name FROM tournament_members WHERE tournament_id = ?',
    [tournamentId]
  );

  const schedule = await getMatchdaySchedule();
  const scoringDays = schedule.filter((m) => m.matchday >= ACTIVE_MATCHDAY);

  const standings = [];

  for (const member of members) {
    const matchdayPoints = {};
    let totalPoints = 0;

    for (const md of scoringDays) {
      if (md.isLocked) {
        await ensureSquadSnapshot(member.user_id, md.matchday);
      }

      const result = await calculateMatchdayPoints(member.user_id, md.matchday, {
        isLocked: md.isLocked,
        isFinished: md.isFinished,
      });

      matchdayPoints[md.matchday] = result.points;
      totalPoints += result.points;
    }

    standings.push({
      userId: member.user_id,
      displayName: member.display_name,
      totalPoints,
      matchdayPoints,
    });
  }

  standings.sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    activeMatchday: ACTIVE_MATCHDAY,
    matchdays: scoringDays.map((m) => m.matchday),
    standings: standings.map((s, i) => ({ ...s, rank: i + 1 })),
  };
}
