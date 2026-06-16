import dotenv from 'dotenv';
import app from './app.js';
import pool from './db/connection.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL conectado');
  } catch (error) {
    console.error('MySQL no disponible:', error.message);
    console.error('Configurá MYSQL_URL en Railway (referencia al servicio MySQL)');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend corriendo en puerto ${PORT}`);
  });
}

start();
