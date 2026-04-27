const express = require('express');
const { requireAuth } = require('../middleware/auth');
const library = require('../services/library');

const router = express.Router();

router.use(requireAuth);

// GET /api/subjects → nested hierarchy (Subject -> Chapters -> Documents)
router.get('/', async (req, res) => {
  try {
    const subjects = await library.listHierarchy(req.user.id);
    res.json({ subjects });
  } catch (err) {
    console.error('GET /api/subjects:', err);
    res.status(500).json({ error: 'Failed to load subjects.' });
  }
});

// POST /api/subjects → create or upsert (by name)
router.post('/', async (req, res) => {
  try {
    const subject = await library.createSubject(req.user.id, req.body || {});
    res.status(201).json({ subject });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create subject.' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
  try {
    const ok = await library.deleteSubject(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Subject not found.' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/subjects/:id', err);
    res.status(500).json({ error: 'Failed to delete subject.' });
  }
});

// POST /api/subjects/:subjectId/chapters
router.post('/:subjectId/chapters', async (req, res) => {
  try {
    const { name, position } = req.body || {};
    const chapter = await library.createChapter(req.user.id, req.params.subjectId, name, position || 0);
    res.status(201).json({ chapter });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create chapter.' });
  }
});

// DELETE /api/subjects/chapters/:id
router.delete('/chapters/:id', async (req, res) => {
  try {
    const ok = await library.deleteChapter(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Chapter not found.' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE chapter', err);
    res.status(500).json({ error: 'Failed to delete chapter.' });
  }
});

// POST /api/subjects/sync-from-planner
// Body: { plannerSubjects: [{ name, topics, deadline, priority, color, ... }] }
router.post('/sync-from-planner', async (req, res) => {
  try {
    const result = await library.syncFromPlanner(req.user.id, req.body?.plannerSubjects);
    res.json(result);
  } catch (err) {
    console.error('Planner sync error:', err);
    res.status(500).json({ error: 'Failed to sync subjects from planner.' });
  }
});

module.exports = router;
