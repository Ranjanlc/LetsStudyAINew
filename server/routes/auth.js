const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../db/pool');
const { signToken, requireAuth } = require('../middleware/auth');
const defaultAppState = require('../defaultAppState');

const router = express.Router();
const SALT_ROUNDS = 10;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  const profile = req.body.profile || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  const grade = typeof profile.grade === 'string' ? profile.grade.trim() : '';
  const goals = typeof profile.goals === 'string' ? profile.goals.trim() : '';
  const studyHoursGoalNum = Number(profile.studyHoursGoal);
  const studyHoursGoal = Number.isFinite(studyHoursGoalNum)
    ? Math.min(12, Math.max(1, Math.round(studyHoursGoalNum)))
    : defaultAppState.user.studyHoursGoal;

  if (!name || !grade || !goals) {
    return res.status(400).json({ error: 'Name, grade/year, and study goal are required.' });
  }

  const pool = getPool();
  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, passwordHash],
    );
    const user = rows[0];
    const initialState = {
      ...defaultAppState,
      user: {
        ...defaultAppState.user,
        name,
        grade,
        goals,
        studyHoursGoal,
      },
    };
    await pool.query(
      `INSERT INTO user_app_state (user_id, state)
       VALUES ($1, $2::jsonb)`,
      [user.id, JSON.stringify(initialState)],
    );

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const row = rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ id: row.id, email: row.email });
    res.json({ token, user: { id: row.id, email: row.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

module.exports = router;
