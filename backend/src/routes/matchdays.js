import { Router } from 'express';
import { getMatchdayInfo, getMatchdaySchedule, ACTIVE_MATCHDAY } from '../services/matchdayService.js';
import { getUserStandings } from '../services/scoringService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/current', async (_req, res, next) => {
  try {
    const info = await getMatchdayInfo(ACTIVE_MATCHDAY);
    res.json(info);
  } catch (error) {
    next(error);
  }
});

router.get('/schedule', async (_req, res, next) => {
  try {
    const schedule = await getMatchdaySchedule();
    res.json({ activeMatchday: ACTIVE_MATCHDAY, schedule });
  } catch (error) {
    next(error);
  }
});

router.get('/my-scores', requireAuth, async (req, res, next) => {
  try {
    const scores = await getUserStandings(req.userId);
    res.json(scores);
  } catch (error) {
    next(error);
  }
});

export default router;
