import { Router } from 'express';
import {
  getTeam,
  addPlayerToSlot,
  removePlayerFromSlot,
  resetTeam,
} from '../services/teamService.js';

const router = Router();

function getUserId(req) {
  return req.headers['x-user-id'] || 'default';
}

router.get('/', async (req, res, next) => {
  try {
    const team = await getTeam(getUserId(req));
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.post('/slots/:slotId/players', async (req, res, next) => {
  try {
    const { playerId } = req.body;
    if (!playerId) {
      return res.status(400).json({ error: 'playerId es requerido.' });
    }

    const team = await addPlayerToSlot(getUserId(req), req.params.slotId, playerId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.delete('/slots/:slotId/players', async (req, res, next) => {
  try {
    const team = await removePlayerFromSlot(getUserId(req), req.params.slotId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const team = await resetTeam(getUserId(req));
    res.json(team);
  } catch (error) {
    next(error);
  }
});

export default router;
