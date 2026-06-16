import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import pool from '../db/connection.js';
import { ensureTeam, updateTeamName as setTeamName } from './teamService.js';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  return process.env.JWT_SECRET || 'gran-dt-dev-secret-cambiar-en-produccion';
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(userId) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS })
  );
  const signature = createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.sub || !data.exp || Date.now() > data.exp) return null;
    return data.sub;
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getUserRow(userId) {
  const [[user]] = await pool.query(
    `SELECT u.id, u.email, ft.team_name
     FROM users u
     LEFT JOIN fantasy_teams ft ON ft.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  return user || null;
}

export async function register({ email, password, teamName }) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedTeam = teamName?.trim();

  if (!validateEmail(normalizedEmail)) {
    throw Object.assign(new Error('Email inválido.'), { status: 400 });
  }
  if (!password || password.length < 6) {
    throw Object.assign(new Error('La contraseña debe tener al menos 6 caracteres.'), {
      status: 400,
    });
  }
  if (!trimmedTeam || trimmedTeam.length < 2) {
    throw Object.assign(new Error('El nombre del equipo debe tener al menos 2 caracteres.'), {
      status: 400,
    });
  }

  const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [
    normalizedEmail,
  ]);
  if (existing) {
    throw Object.assign(new Error('Ya existe una cuenta con ese email.'), { status: 409 });
  }

  const userId = randomUUID();
  const passwordHash = hashPassword(password);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, normalizedEmail, passwordHash]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await ensureTeam(userId, trimmedTeam);

  const token = signToken(userId);
  const user = await getUserRow(userId);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      teamName: user.team_name,
    },
  };
}

export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!validateEmail(normalizedEmail)) {
    throw Object.assign(new Error('Email o contraseña incorrectos.'), { status: 401 });
  }

  const [[row]] = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw Object.assign(new Error('Email o contraseña incorrectos.'), { status: 401 });
  }

  await ensureTeam(row.id);
  const token = signToken(row.id);
  const user = await getUserRow(row.id);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      teamName: user.team_name || 'Mi Equipo',
    },
  };
}

export async function getMe(userId) {
  const user = await getUserRow(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
  }

  return {
    id: user.id,
    email: user.email,
    teamName: user.team_name || 'Mi Equipo',
  };
}

export async function updateTeamName(userId, teamName) {
  const trimmed = teamName?.trim();
  if (!trimmed || trimmed.length < 2) {
    throw Object.assign(new Error('El nombre del equipo debe tener al menos 2 caracteres.'), {
      status: 400,
    });
  }
  if (trimmed.length > 80) {
    throw Object.assign(new Error('El nombre del equipo es demasiado largo.'), { status: 400 });
  }

  await ensureTeam(userId);
  await setTeamName(userId, trimmed);
  return getMe(userId);
}
