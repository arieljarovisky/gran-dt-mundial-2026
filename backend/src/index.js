import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import playersRouter from './routes/players.js';
import teamsRouter from './routes/teams.js';
import worldcupRouter from './routes/worldcup.js';
import tournamentsRouter from './routes/tournaments.js';
import matchdaysRouter from './routes/matchdays.js';
import { BASE_URL } from './services/worldcupApi.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
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

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
  console.log(`World Cup API: ${BASE_URL}`);
});
