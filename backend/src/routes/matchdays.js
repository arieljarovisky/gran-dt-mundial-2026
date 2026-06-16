import { Router } from 'express';
import { getMatchdayInfo, getMatchdaySchedule, ACTIVE_MATCHDAY } from '../services/matchdayService.js';
import { getUserStandings } from '../services/scoringService.js';

const router = Router();

function getUserId(req) {
  return req.headers['x-user-id'] || 'default';
}

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

router.get('/my-scores', async (req, res, next) => {
  try {
    const scores = await getUserStandings(getUserId(req));
    res.json(scores);
  } catch (error) {
    next(error);
  }
});

export default router;
