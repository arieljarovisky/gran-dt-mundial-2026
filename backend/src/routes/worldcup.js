import { Router } from 'express';
import {
  getTeams,
  getTeamByName,
  getGames,
  getGroups,
  getStadiums,
  getHealth,
  clearWorldcupCache,
  BASE_URL,
} from '../services/worldcupApi.js';
import { invalidatePlayersCache } from '../services/playersBuilder.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    const health = await getHealth();
    res.json({ source: BASE_URL, ...health });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', (_req, res) => {
  clearWorldcupCache();
  invalidatePlayersCache();
  res.json({ ok: true });
});

router.get('/teams', async (_req, res, next) => {
  try {
    const teams = await getTeams();
    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

router.get('/teams/by-name/:name', async (req, res, next) => {
  try {
    const data = await getTeamByName(req.params.name);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/games', async (_req, res, next) => {
  try {
    const games = await getGames();
    res.json({ games });
  } catch (error) {
    next(error);
  }
});

router.get('/groups', async (_req, res, next) => {
  try {
    const groups = await getGroups();
    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

router.get('/stadiums', async (_req, res, next) => {
  try {
    const stadiums = await getStadiums();
    res.json({ stadiums });
  } catch (error) {
    next(error);
  }
});

export default router;
