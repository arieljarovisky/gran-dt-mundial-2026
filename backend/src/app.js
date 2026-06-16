import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import playersRouter from './routes/players.js';
import teamsRouter from './routes/teams.js';
import worldcupRouter from './routes/worldcup.js';
import tournamentsRouter from './routes/tournaments.js';
import matchdaysRouter from './routes/matchdays.js';
import { BASE_URL } from './services/worldcupApi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(',').map((origin) => origin.trim()))
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : true;
}

app.use(cors({ origin: getAllowedOrigins() }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', worldcupApi: BASE_URL });
});

app.use('/api/worldcup', worldcupRouter);
app.use('/api/players', playersRouter);
app.use('/api/team', teamsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/matchdays', matchdaysRouter);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Error interno del servidor.',
  });
});

export default app;
