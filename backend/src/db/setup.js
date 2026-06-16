import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { INITIAL_SLOTS, INITIAL_BUDGET } from '../services/teamService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  const dbName = process.env.DB_NAME || 'gran_dt_mundial';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${dbName}\``);

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

  console.log(`Base de datos "${dbName}" lista.`);
  await connection.end();
}

setup().catch((err) => {
  console.error('Error al configurar la base de datos:', err.message);
  process.exit(1);
});
