const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseDocument } = require('../rag/documentParser');
const { addChunks, removeDocument } = require('../rag/vectorStore');
const { getPool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { ensureUserDocumentsIndexed } = require('../services/documentIndex');
const library = require('../services/library');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', req.user.id);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, DOC, TXT, and MD files are allowed.'));
    }
  },
});

router.use(requireAuth);

// POST /api/documents/upload  (multipart: document file + chapterId field)
router.post('/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const chapterId = (req.body?.chapterId || '').trim();
  if (!chapterId) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      error: 'A chapter must be selected before uploading. Send chapterId with the upload.',
    });
  }

  const ownsChapter = await library.chapterBelongsToUser(req.user.id, chapterId);
  if (!ownsChapter) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'Selected chapter not found for this user.' });
  }

  const docId = `doc-${Date.now()}`;
  const originalName = req.file.originalname;
  const filePath = req.file.path;
  const pool = getPool();

  try {
    const { chunks, wordCount } = await parseDocument(filePath, originalName);

    addChunks(req.user.id, docId, originalName, chunks);

    await pool.query(
      `INSERT INTO user_documents (id, user_id, name, file_path, word_count, chunk_count, chapter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [docId, req.user.id, originalName, filePath, wordCount, chunks.length, chapterId],
    );

    const uploadedAt = new Date().toISOString();
    res.json({
      success: true,
      document: {
        id: docId,
        name: originalName,
        wordCount,
        chunkCount: chunks.length,
        chapterId,
        uploadedAt,
      },
    });
  } catch (err) {
    fs.unlink(filePath, () => {});
    res.status(422).json({ error: err.message || 'Failed to process the document.' });
  }
});

// GET /api/documents
// Returns flat list (with chapter/subject info) for back-compat,
// and `?group=hierarchy` returns the nested Subject -> Chapter -> Document tree.
router.get('/', async (req, res) => {
  await ensureUserDocumentsIndexed(req.user.id);

  if (req.query.group === 'hierarchy') {
    const subjects = await library.listHierarchy(req.user.id);
    return res.json({ subjects });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
        d.id,
        d.name,
        d.word_count   AS "wordCount",
        d.chunk_count  AS "chunkCount",
        d.uploaded_at  AS "uploadedAt",
        d.chapter_id   AS "chapterId",
        c.name         AS "chapterName",
        s.id           AS "subjectId",
        s.name         AS "subjectName",
        s.color        AS "subjectColor"
     FROM user_documents d
     LEFT JOIN chapters c ON c.id = d.chapter_id
     LEFT JOIN subjects s ON s.id = c.subject_id
     WHERE d.user_id = $1
     ORDER BY d.uploaded_at DESC`,
    [req.user.id],
  );
  res.json({ documents: rows });
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();

  const { rows } = await pool.query(
    'SELECT file_path FROM user_documents WHERE id = $1 AND user_id = $2',
    [id, req.user.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const filePath = rows[0].file_path;
  removeDocument(req.user.id, id);
  await pool.query('DELETE FROM user_documents WHERE id = $1 AND user_id = $2', [id, req.user.id]);

  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {});
  }

  res.json({ success: true, id });
});

module.exports = router;
