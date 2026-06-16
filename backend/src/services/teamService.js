import pool from '../db/connection.js';
import { getPlayerById } from './playersBuilder.js';
import { assertSquadEditable, getMatchdayInfo } from './matchdayService.js';

export const INITIAL_BUDGET = 100_000_000;

export const INITIAL_SLOTS = [
  { id: 'gk1', position: 'POR' },
  { id: 'def1', position: 'DEF' },
  { id: 'def2', position: 'DEF' },
  { id: 'def3', position: 'DEF' },
  { id: 'def4', position: 'DEF' },
  { id: 'mid1', position: 'MED' },
  { id: 'mid2', position: 'MED' },
  { id: 'mid3', position: 'MED' },
  { id: 'mid4', position: 'MED' },
  { id: 'fwd1', position: 'DEL' },
  { id: 'fwd2', position: 'DEL' },
];

export async function ensureTeam(userId) {
  await pool.query(
    `INSERT INTO fantasy_teams (user_id, budget) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId, INITIAL_BUDGET]
  );

  for (const slot of INITIAL_SLOTS) {
    await pool.query(
      `INSERT INTO team_slots (user_id, slot_id, position, player_id)
       VALUES (?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE position = VALUES(position)`,
      [userId, slot.id, slot.position]
    );
  }
}

export async function getTeam(userId) {
  await ensureTeam(userId);

  const [[team]] = await pool.query(
    'SELECT user_id, budget FROM fantasy_teams WHERE user_id = ?',
    [userId]
  );

  const [slots] = await pool.query(
    `SELECT slot_id, position, player_id
     FROM team_slots
     WHERE user_id = ?
     ORDER BY FIELD(slot_id, 'gk1', 'def1', 'def2', 'def3', 'def4', 'mid1', 'mid2', 'mid3', 'mid4', 'fwd1', 'fwd2')`,
    [userId]
  );

  const enriched = await Promise.all(
    slots.map(async (row) => {
      const player = row.player_id ? await getPlayerById(row.player_id) : null;
      return {
        id: row.slot_id,
        position: row.position,
        player: player
          ? {
              id: player.id,
              name: player.name,
              country: player.country,
              teamCode: player.teamCode,
              position: player.position,
              price: player.price,
              points: player.points,
              flag: player.flag,
            }
          : null,
      };
    })
  );

  return {
    userId: team.user_id,
    budget: team.budget,
    slots: enriched,
    matchday: await getMatchdayInfo(),
  };
}

export async function addPlayerToSlot(userId, slotId, playerId) {
  await assertSquadEditable();
  await ensureTeam(userId);

  const player = await getPlayerById(playerId);
  if (!player) {
    throw Object.assign(new Error('Jugador no encontrado.'), { status: 404 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[slot]] = await connection.query(
      'SELECT slot_id, position, player_id FROM team_slots WHERE user_id = ? AND slot_id = ? FOR UPDATE',
      [userId, slotId]
    );

    if (!slot) {
      throw Object.assign(new Error('Posición no encontrada.'), { status: 404 });
    }

    if (player.position !== slot.position) {
      throw Object.assign(new Error('La posición del jugador no coincide.'), { status: 400 });
    }

    const [duplicates] = await connection.query(
      `SELECT slot_id FROM team_slots
       WHERE user_id = ? AND player_id = ? AND slot_id != ?`,
      [userId, playerId, slotId]
    );

    if (duplicates.length > 0) {
      throw Object.assign(new Error('El jugador ya está en tu equipo.'), { status: 400 });
    }

    const [[team]] = await connection.query(
      'SELECT budget FROM fantasy_teams WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    let newBudget = team.budget;

    if (slot.player_id) {
      const current = await getPlayerById(slot.player_id);
      if (current) newBudget += current.price;
    }

    if (newBudget < player.price) {
      throw Object.assign(new Error('Presupuesto insuficiente.'), { status: 400 });
    }

    newBudget -= player.price;

    await connection.query('UPDATE fantasy_teams SET budget = ? WHERE user_id = ?', [newBudget, userId]);
    await connection.query(
      'UPDATE team_slots SET player_id = ? WHERE user_id = ? AND slot_id = ?',
      [playerId, userId, slotId]
    );

    await connection.commit();
    return getTeam(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removePlayerFromSlot(userId, slotId) {
  await assertSquadEditable();
  await ensureTeam(userId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[slot]] = await connection.query(
      'SELECT player_id FROM team_slots WHERE user_id = ? AND slot_id = ? FOR UPDATE',
      [userId, slotId]
    );

    if (!slot || !slot.player_id) {
      throw Object.assign(new Error('No hay jugador en esta posición.'), { status: 400 });
    }

    const player = await getPlayerById(slot.player_id);
    if (player) {
      await connection.query('UPDATE fantasy_teams SET budget = budget + ? WHERE user_id = ?', [
        player.price,
        userId,
      ]);
    }

    await connection.query(
      'UPDATE team_slots SET player_id = NULL WHERE user_id = ? AND slot_id = ?',
      [userId, slotId]
    );

    await connection.commit();
    return getTeam(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resetTeam(userId) {
  await assertSquadEditable();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM team_slots WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM fantasy_teams WHERE user_id = ?', [userId]);
    await connection.commit();
    return getTeam(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
