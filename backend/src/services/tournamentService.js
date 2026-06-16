import crypto from 'crypto';
import pool from '../db/connection.js';
import { getTeam } from './teamService.js';
import { getTournamentStandings } from './scoringService.js';
import { getMatchdayInfo } from './matchdayService.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return code;
}

async function uniqueInviteCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const [rows] = await pool.query('SELECT id FROM tournaments WHERE invite_code = ?', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('No se pudo generar un código de invitación.');
}

function mapTournament(row) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    creatorUserId: row.creator_user_id,
    maxMembers: row.max_members,
    memberCount: Number(row.member_count) || 0,
    createdAt: row.created_at,
  };
}

async function getMemberSummary(userId) {
  const team = await getTeam(userId);
  const filled = team.slots.filter((s) => s.player).length;
  const squadValue = team.slots.reduce((sum, s) => sum + (s.player?.price || 0), 0);

  return {
    userId: team.userId,
    playersCount: filled,
    totalSlots: team.slots.length,
    budget: team.budget,
    squadValue,
    isComplete: filled === team.slots.length,
  };
}

export async function createTournament(userId, { name, displayName, maxMembers = 20 }) {
  const trimmedName = name?.trim();
  const trimmedDisplay = displayName?.trim();

  if (!trimmedName || trimmedName.length < 3) {
    throw Object.assign(new Error('El nombre del torneo debe tener al menos 3 caracteres.'), { status: 400 });
  }

  if (!trimmedDisplay || trimmedDisplay.length < 2) {
    throw Object.assign(new Error('Tu nombre debe tener al menos 2 caracteres.'), { status: 400 });
  }

  const id = crypto.randomUUID();
  const inviteCode = await uniqueInviteCode();
  const limit = Math.min(Math.max(Number(maxMembers) || 20, 2), 50);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO tournaments (id, name, invite_code, creator_user_id, max_members)
       VALUES (?, ?, ?, ?, ?)`,
      [id, trimmedName, inviteCode, userId, limit]
    );

    await connection.query(
      `INSERT INTO tournament_members (tournament_id, user_id, display_name)
       VALUES (?, ?, ?)`,
      [id, userId, trimmedDisplay]
    );

    await connection.commit();
    return getTournamentById(id, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function joinTournament(userId, { inviteCode, displayName }) {
  const code = inviteCode?.trim().toUpperCase();
  const trimmedDisplay = displayName?.trim();

  if (!code || code.length < 4) {
    throw Object.assign(new Error('Ingresá un código de invitación válido.'), { status: 400 });
  }

  if (!trimmedDisplay || trimmedDisplay.length < 2) {
    throw Object.assign(new Error('Tu nombre debe tener al menos 2 caracteres.'), { status: 400 });
  }

  const [[tournament]] = await pool.query(
    'SELECT id, max_members FROM tournaments WHERE invite_code = ?',
    [code]
  );

  if (!tournament) {
    throw Object.assign(new Error('Torneo no encontrado. Verificá el código.'), { status: 404 });
  }

  const [[memberCount]] = await pool.query(
    'SELECT COUNT(*) AS total FROM tournament_members WHERE tournament_id = ?',
    [tournament.id]
  );

  if (memberCount.total >= tournament.max_members) {
    throw Object.assign(new Error('El torneo ya está lleno.'), { status: 400 });
  }

  const [[existing]] = await pool.query(
    'SELECT display_name FROM tournament_members WHERE tournament_id = ? AND user_id = ?',
    [tournament.id, userId]
  );

  if (existing) {
    await pool.query(
      'UPDATE tournament_members SET display_name = ? WHERE tournament_id = ? AND user_id = ?',
      [trimmedDisplay, tournament.id, userId]
    );
    return getTournamentById(tournament.id, userId);
  }

  await pool.query(
    `INSERT INTO tournament_members (tournament_id, user_id, display_name)
     VALUES (?, ?, ?)`,
    [tournament.id, userId, trimmedDisplay]
  );

  return getTournamentById(tournament.id, userId);
}

export async function listUserTournaments(userId) {
  const [rows] = await pool.query(
    `SELECT t.*, COUNT(tm.user_id) AS member_count
     FROM tournaments t
     INNER JOIN tournament_members m ON m.tournament_id = t.id AND m.user_id = ?
     LEFT JOIN tournament_members tm ON tm.tournament_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [userId]
  );

  return rows.map(mapTournament);
}

export async function getTournamentById(tournamentId, userId) {
  const [[row]] = await pool.query(
    `SELECT t.*, COUNT(tm.user_id) AS member_count
     FROM tournaments t
     LEFT JOIN tournament_members tm ON tm.tournament_id = t.id
     WHERE t.id = ?
     GROUP BY t.id`,
    [tournamentId]
  );

  if (!row) {
    throw Object.assign(new Error('Torneo no encontrado.'), { status: 404 });
  }

  const [members] = await pool.query(
    `SELECT user_id, display_name, joined_at
     FROM tournament_members
     WHERE tournament_id = ?
     ORDER BY joined_at ASC`,
    [tournamentId]
  );

  const isMember = members.some((m) => m.user_id === userId);
  if (!isMember) {
    throw Object.assign(new Error('No pertenecés a este torneo.'), { status: 403 });
  }

  const enrichedMembers = await Promise.all(
    members.map(async (member) => {
      const summary = await getMemberSummary(member.user_id);
      return {
        userId: member.user_id,
        displayName: member.display_name,
        joinedAt: member.joined_at,
        isCreator: member.user_id === row.creator_user_id,
        isYou: member.user_id === userId,
        ...summary,
      };
    })
  );

  return {
    ...mapTournament(row),
    isCreator: row.creator_user_id === userId,
    matchday: await getMatchdayInfo(),
    members: enrichedMembers,
  };
}

export async function getStandings(tournamentId, userId) {
  const [[member]] = await pool.query(
    'SELECT user_id FROM tournament_members WHERE tournament_id = ? AND user_id = ?',
    [tournamentId, userId]
  );

  if (!member) {
    throw Object.assign(new Error('No pertenecés a este torneo.'), { status: 403 });
  }

  return getTournamentStandings(tournamentId);
}
