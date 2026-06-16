import pool from '../db/connection.js';
import { getAllPlayers } from './playersBuilder.js';
import { getGames, getTeams } from './worldcupApi.js';
import { ACTIVE_MATCHDAY, getMatchdaySchedule } from './matchdayService.js';
import { ensureTeam } from './teamService.js';

const GOAL_POINTS = { POR: 6, DEF: 6, MED: 5, DEL: 4 };
const CLEAN_SHEET_POINTS = { POR: 4, DEF: 4 };
const APPEARANCE_POINTS = 1;

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

function parseScorers(raw) {
  if (!raw || raw === 'null') return [];

  return raw
    .replace(/^\{|\}$/g, '')
    .split('","')
    .map((entry) =>
      entry
        .replace(/^"|"$/g, '')
        .replace(/\s+\d+.*$/, '')
        .replace(/\s*\(p\)\s*$/i, '')
        .replace(/\s*\(OG\)\s*$/i, '')
        .trim()
    )
    .filter(Boolean);
}

async function buildTeamCodeToApiId() {
  const teams = await getTeams();
  return new Map(teams.map((t) => [t.fifa_code, String(t.id)]));
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
  const teamIdMap = await buildTeamCodeToApiId();

  const squad = squadRows
    .filter((r) => r.player_id)
    .map((r) => ({ ...r, player: playerMap.get(r.player_id) }))
    .filter((r) => r.player);

  const games = (await getGames()).filter((g) => Number(g.matchday) === Number(matchday));
  const breakdown = [];
  let total = 0;

  for (const slot of squad) {
    const player = slot.player;
    const apiTeamId = teamIdMap.get(player.teamCode);
    let playerPoints = 0;
    const events = [];

    for (const game of games) {
      if (game.finished !== 'TRUE') continue;

      const isHome = String(game.home_team_id) === apiTeamId;
      const isAway = String(game.away_team_id) === apiTeamId;
      if (!isHome && !isAway) continue;

      events.push({ type: 'appearance', points: APPEARANCE_POINTS });
      playerPoints += APPEARANCE_POINTS;

      const scorers = parseScorers(isHome ? game.home_scorers : game.away_scorers);
      const goals = scorers.filter((s) => scorerMatchesPlayer(s, player.name)).length;

      if (goals > 0) {
        const pts = goals * GOAL_POINTS[player.position];
        playerPoints += pts;
        events.push({ type: 'goal', count: goals, points: pts });
      }

      const conceded = isHome ? Number(game.away_score) : Number(game.home_score);
      if (conceded === 0 && CLEAN_SHEET_POINTS[player.position]) {
        playerPoints += CLEAN_SHEET_POINTS[player.position];
        events.push({ type: 'clean_sheet', points: CLEAN_SHEET_POINTS[player.position] });
      } else if (player.position === 'POR' && conceded > 0) {
        const penalty = -conceded;
        playerPoints += penalty;
        events.push({ type: 'goals_conceded', count: conceded, points: penalty });
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
