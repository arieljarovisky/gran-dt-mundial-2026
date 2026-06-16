import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { getDbConfig, getDbName, isRailwayDb } from './config.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration(connection, sql, ignoreCode) {
  try {
    await connection.query(sql);
  } catch (error) {
    if (error.code !== ignoreCode) throw error;
  }
}

async function migrate(connection) {
  await runMigration(
    connection,
    `ALTER TABLE fantasy_teams ADD COLUMN team_name VARCHAR(80) NOT NULL DEFAULT 'Mi Equipo'`,
    'ER_DUP_FIELDNAME'
  );

  await runMigration(
    connection,
    `ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL`,
    'ER_BAD_FIELD_ERROR'
  );
}

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
  await migrate(connection);

  console.log('Tablas listas: users, fantasy_teams, team_slots, tournaments, matchday_squads, matchday_scores');
  await connection.end();
}

setup().catch((err) => {
  console.error('Error al configurar la base de datos:', err.message);
  process.exit(1);
});
