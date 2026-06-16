import { Router } from 'express';
import {
  createTournament,
  joinTournament,
  listUserTournaments,
  getTournamentById,
  getStandings,
} from '../services/tournamentService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const tournaments = await listUserTournaments(req.userId);
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, displayName, maxMembers } = req.body;
    const tournament = await createTournament(req.userId, { name, displayName, maxMembers });
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode, displayName } = req.body;
    const tournament = await joinTournament(req.userId, { inviteCode, displayName });
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/standings', async (req, res, next) => {
  try {
    const standings = await getStandings(req.params.id, req.userId);
    res.json(standings);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tournament = await getTournamentById(req.params.id, req.userId);
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

export default router;
