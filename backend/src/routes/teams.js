import { Router } from 'express';
import {
  getTeam,
  addPlayerToSlot,
  removePlayerFromSlot,
  resetTeam,
  updateTeamName,
} from '../services/teamService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const team = await getTeam(req.userId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.patch('/name', async (req, res, next) => {
  try {
    const { teamName } = req.body;
    await updateTeamName(req.userId, teamName);
    const team = await getTeam(req.userId);
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

    const team = await addPlayerToSlot(req.userId, req.params.slotId, playerId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.delete('/slots/:slotId/players', async (req, res, next) => {
  try {
    const team = await removePlayerFromSlot(req.userId, req.params.slotId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const team = await resetTeam(req.userId);
    res.json(team);
  } catch (error) {
    next(error);
  }
});

export default router;
