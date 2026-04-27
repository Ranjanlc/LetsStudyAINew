const express = require('express');
const { getPool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const defaultAppState = require('../defaultAppState');

const router = express.Router();

const STATE_KEYS = [
  'user', 'subjects', 'studyPlan', 'chatHistory', 'quizHistory',
  'currentQuiz', 'notifications',
  // Shared cross-agent context — these flow back so other endpoints can read them.
  'topicMastery', 'learningObjectives', 'agentInbox',
];

function mergeWithDefaults(raw) {
  const base = typeof raw === 'object' && raw !== null ? raw : {};
  const out = { ...defaultAppState };
  for (const k of STATE_KEYS) {
    if (base[k] !== undefined) out[k] = base[k];
  }
  if (base.user && typeof base.user === 'object') {
    out.user = { ...defaultAppState.user, ...base.user };
  }
  return out;
}

// GET /api/user/state
router.get('/state', requireAuth, async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'SELECT state FROM user_app_state WHERE user_id = $1',
      [req.user.id],
    );
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO user_app_state (user_id, state) VALUES ($1, $2::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, JSON.stringify(defaultAppState)],
      );
      return res.json({ state: defaultAppState });
    }
    res.json({ state: mergeWithDefaults(rows[0].state) });
  } catch (err) {
    console.error('GET user state:', err);
    res.status(500).json({ error: 'Failed to load saved data.' });
  }
});

// PUT /api/user/state
router.put('/state', requireAuth, async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid state body.' });
  }

  const state = mergeWithDefaults(body);

  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO user_app_state (user_id, state, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [req.user.id, JSON.stringify(state)],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT user state:', err);
    res.status(500).json({ error: 'Failed to save data.' });
  }
});

module.exports = router;
