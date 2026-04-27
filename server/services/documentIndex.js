const fs = require('fs');
const { getPool } = require('../db/pool');
const { parseDocument } = require('../rag/documentParser');
const vectorStore = require('../rag/vectorStore');

/** Re-parse and index any DB documents that are not yet in memory (e.g. after server restart). */
async function ensureUserDocumentsIndexed(userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, name, file_path FROM user_documents WHERE user_id = $1',
    [userId],
  );

  for (const row of rows) {
    const existing = vectorStore.getDocumentChunks(userId, row.id);
    if (existing.length > 0) continue;
    if (!fs.existsSync(row.file_path)) {
      console.warn(`Missing file for document ${row.id}, skipping reindex`);
      continue;
    }
    try {
      const { chunks, wordCount } = await parseDocument(row.file_path, row.name);
      vectorStore.addChunks(userId, row.id, row.name, chunks);
      await pool.query(
        'UPDATE user_documents SET word_count = $2, chunk_count = $3 WHERE id = $1 AND user_id = $4',
        [row.id, wordCount, chunks.length, userId],
      );
    } catch (e) {
      console.error(`Reindex failed for document ${row.id}:`, e.message);
    }
  }
}

async function userOwnsDocument(userId, documentId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT 1 FROM user_documents WHERE id = $1 AND user_id = $2',
    [documentId, userId],
  );
  return rows.length > 0;
}

// Returns the subset of provided document IDs that actually belong to the user.
async function userOwnedDocumentIds(userId, documentIds = []) {
  if (!Array.isArray(documentIds) || documentIds.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id FROM user_documents WHERE user_id = $1 AND id = ANY($2::text[])',
    [userId, documentIds],
  );
  return rows.map(r => r.id);
}

module.exports = { ensureUserDocumentsIndexed, userOwnsDocument, userOwnedDocumentIds };
