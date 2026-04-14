const express = require('express');
const store = require('../data/plannerStore');

const router = express.Router();

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', (req, res) => {
  const { id } = req.params;
  const updated = store.markTaskComplete(id);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json({ task: updated });
});

// GET /api/tasks - helper to list generated tasks
router.get('/', (req, res) => {
  res.json({ tasks: store.getTasks() });
});

module.exports = router;
