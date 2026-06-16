import { Router } from 'express';
import { getPlayers } from '../services/playersService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { position, search, teamCode } = req.query;
    const players = await getPlayers({
      position: position || undefined,
      search: search || undefined,
      teamCode: teamCode || undefined,
    });
    res.json(players);
  } catch (error) {
    next(error);
  }
});

export default router;
