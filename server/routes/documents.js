const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseDocument } = require('../rag/documentParser');
const { addChunks, removeDocument, getDocumentList } = require('../rag/vectorStore');

const router = express.Router();

// Store uploaded files in server/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
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

// In-memory registry of uploaded docs (survives restart via re-parse if needed)
const docRegistry = new Map(); // docId -> { id, name, filePath, uploadedAt, wordCount, chunks }

// POST /api/documents/upload
router.post('/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const docId = `doc-${Date.now()}`;
  const originalName = req.file.originalname;
  const filePath = req.file.path;

  try {
    const { chunks, wordCount } = await parseDocument(filePath, originalName);

    addChunks(docId, originalName, chunks);

    const docInfo = {
      id: docId,
      name: originalName,
      filePath,
      uploadedAt: new Date().toISOString(),
      wordCount,
      chunkCount: chunks.length,
    };
    docRegistry.set(docId, docInfo);

    res.json({
      success: true,
      document: {
        id: docId,
        name: originalName,
        wordCount,
        chunkCount: chunks.length,
        uploadedAt: docInfo.uploadedAt,
      },
    });
  } catch (err) {
    // Clean up uploaded file on parse error
    fs.unlink(filePath, () => {});
    res.status(422).json({ error: err.message || 'Failed to process the document.' });
  }
});

// GET /api/documents
router.get('/', (req, res) => {
  const docs = Array.from(docRegistry.values()).map(d => ({
    id: d.id,
    name: d.name,
    wordCount: d.wordCount,
    chunkCount: d.chunkCount,
    uploadedAt: d.uploadedAt,
  }));
  res.json({ documents: docs });
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const doc = docRegistry.get(id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Remove from vector store and registry
  removeDocument(id);
  docRegistry.delete(id);

  // Delete uploaded file
  if (doc.filePath && fs.existsSync(doc.filePath)) {
    fs.unlink(doc.filePath, () => {});
  }

  res.json({ success: true, id });
});

module.exports = router;
