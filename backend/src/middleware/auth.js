import { verifyToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = verifyToken(token);

  if (!userId) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }

  req.userId = userId;
  next();
}
