import { Router } from 'express';
import {
  createTournament,
  joinTournament,
  listUserTournaments,
  getTournamentById,
  getStandings,
} from '../services/tournamentService.js';

const router = Router();

function getUserId(req) {
  return req.headers['x-user-id'] || 'default';
}

router.get('/', async (req, res, next) => {
  try {
    const tournaments = await listUserTournaments(getUserId(req));
    res.json(tournaments);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, displayName, maxMembers } = req.body;
    const tournament = await createTournament(getUserId(req), { name, displayName, maxMembers });
    res.status(201).json(tournament);
  } catch (error) {
    next(error);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode, displayName } = req.body;
    const tournament = await joinTournament(getUserId(req), { inviteCode, displayName });
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/standings', async (req, res, next) => {
  try {
    const standings = await getStandings(req.params.id, getUserId(req));
    res.json(standings);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tournament = await getTournamentById(req.params.id, getUserId(req));
    res.json(tournament);
  } catch (error) {
    next(error);
  }
});

export default router;
