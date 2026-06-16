import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { INITIAL_SLOTS, INITIAL_BUDGET } from '../services/teamService.js';
import { getDbConfig, getDbName, isRailwayDb } from './config.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  const dbName = getDbName();
  const useRailway = isRailwayDb();

  let connection;

  if (useRailway) {
    connection = await mysql.createConnection({
      ...getDbConfig(),
      multipleStatements: true,
    });
    console.log(`Conectado a Railway MySQL (${dbName})...`);
  } else {
    connection = await mysql.createConnection({
      ...getDbConfig({ withDatabase: false }),
      multipleStatements: true,
    });
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);
    console.log(`Base de datos local "${dbName}" creada/verificada.`);
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(schema);

  const defaultUserId = 'default';
  await connection.query(
    `INSERT INTO fantasy_teams (user_id, budget) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE budget = budget`,
    [defaultUserId, INITIAL_BUDGET]
  );

  for (const slot of INITIAL_SLOTS) {
    await connection.query(
      `INSERT INTO team_slots (user_id, slot_id, position, player_id)
       VALUES (?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE position = VALUES(position)`,
      [defaultUserId, slot.id, slot.position]
    );
  }

  console.log('Tablas listas: fantasy_teams, team_slots, tournaments, matchday_squads, matchday_scores');
  await connection.end();
}

setup().catch((err) => {
  console.error('Error al configurar la base de datos:', err.message);
  process.exit(1);
});
