import { Router } from 'express';
import { register, login, getMe, updateTeamName } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const result = await register(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getMe(req.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/team-name', requireAuth, async (req, res, next) => {
  try {
    const user = await updateTeamName(req.userId, req.body.teamName);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
