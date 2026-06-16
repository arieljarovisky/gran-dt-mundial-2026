import mysql from 'mysql2/promise';
import { getDbConfig } from './config.js';

const pool = mysql.createPool({
  ...getDbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
