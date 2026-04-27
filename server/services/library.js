const { getPool } = require('../db/pool');

// Subject + Chapter persistence for the document library.
// Designed to be the single source of truth for the Subject -> Chapter -> Document hierarchy.

async function listHierarchy(userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
        s.id              AS subject_id,
        s.name            AS subject_name,
        s.color           AS subject_color,
        s.deadline        AS subject_deadline,
        s.priority        AS subject_priority,
        s.difficulty      AS subject_difficulty,
        s.estimated_hours AS subject_estimated_hours,
        s.created_at      AS subject_created_at,
        c.id              AS chapter_id,
        c.name            AS chapter_name,
        c.position        AS chapter_position,
        c.created_at      AS chapter_created_at,
        d.id              AS document_id,
        d.name            AS document_name,
        d.word_count      AS document_word_count,
        d.chunk_count     AS document_chunk_count,
        d.uploaded_at     AS document_uploaded_at
     FROM subjects s
     LEFT JOIN chapters c       ON c.subject_id = s.id
     LEFT JOIN user_documents d ON d.chapter_id = c.id AND d.user_id = s.user_id
     WHERE s.user_id = $1
     ORDER BY s.created_at ASC, c.position ASC, c.created_at ASC, d.uploaded_at DESC`,
    [userId],
  );

  const subjects = new Map();
  for (const row of rows) {
    let subject = subjects.get(row.subject_id);
    if (!subject) {
      subject = {
        id: row.subject_id,
        name: row.subject_name,
        color: row.subject_color,
        deadline: row.subject_deadline,
        priority: row.subject_priority,
        difficulty: row.subject_difficulty,
        estimatedHours: row.subject_estimated_hours,
        createdAt: row.subject_created_at,
        chapters: [],
      };
      subjects.set(row.subject_id, subject);
    }

    if (!row.chapter_id) continue;

    let chapter = subject.chapters.find(ch => ch.id === row.chapter_id);
    if (!chapter) {
      chapter = {
        id: row.chapter_id,
        subjectId: row.subject_id,
        name: row.chapter_name,
        position: row.chapter_position,
        createdAt: row.chapter_created_at,
        documents: [],
      };
      subject.chapters.push(chapter);
    }

    if (!row.document_id) continue;
    chapter.documents.push({
      id: row.document_id,
      name: row.document_name,
      wordCount: row.document_word_count,
      chunkCount: row.document_chunk_count,
      uploadedAt: row.document_uploaded_at,
      chapterId: row.chapter_id,
      subjectId: row.subject_id,
    });
  }

  return Array.from(subjects.values());
}

async function createSubject(userId, payload) {
  const pool = getPool();
  const { name, color, deadline, priority, difficulty, estimatedHours } = payload || {};
  if (!name || !name.trim()) throw new Error('Subject name is required.');

  const { rows } = await pool.query(
    `INSERT INTO subjects (user_id, name, color, deadline, priority, difficulty, estimated_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, lower(name)) DO UPDATE
       SET color           = COALESCE(EXCLUDED.color, subjects.color),
           deadline        = COALESCE(EXCLUDED.deadline, subjects.deadline),
           priority        = COALESCE(EXCLUDED.priority, subjects.priority),
           difficulty      = COALESCE(EXCLUDED.difficulty, subjects.difficulty),
           estimated_hours = COALESCE(EXCLUDED.estimated_hours, subjects.estimated_hours),
           updated_at      = NOW()
     RETURNING id, name, color, deadline, priority, difficulty, estimated_hours, created_at`,
    [
      userId,
      name.trim(),
      color || null,
      deadline || null,
      priority || null,
      difficulty || null,
      estimatedHours || null,
    ],
  );
  return rows[0];
}

async function deleteSubject(userId, subjectId) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM subjects WHERE id = $1 AND user_id = $2',
    [subjectId, userId],
  );
  return rowCount > 0;
}

async function createChapter(userId, subjectId, name, position = 0) {
  if (!name || !name.trim()) throw new Error('Chapter name is required.');

  const pool = getPool();
  const owns = await pool.query(
    'SELECT 1 FROM subjects WHERE id = $1 AND user_id = $2',
    [subjectId, userId],
  );
  if (owns.rowCount === 0) throw new Error('Subject not found.');

  const { rows } = await pool.query(
    `INSERT INTO chapters (subject_id, name, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (subject_id, lower(name)) DO UPDATE
       SET updated_at = NOW()
     RETURNING id, subject_id AS "subjectId", name, position, created_at AS "createdAt"`,
    [subjectId, name.trim(), position],
  );
  return rows[0];
}

async function deleteChapter(userId, chapterId) {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM chapters
     WHERE id = $1
       AND subject_id IN (SELECT id FROM subjects WHERE user_id = $2)`,
    [chapterId, userId],
  );
  return rowCount > 0;
}

async function chapterBelongsToUser(userId, chapterId) {
  if (!chapterId) return false;
  const pool = getPool();
  const { rowCount } = await pool.query(
    `SELECT 1
       FROM chapters c
       JOIN subjects s ON s.id = c.subject_id
      WHERE c.id = $1 AND s.user_id = $2`,
    [chapterId, userId],
  );
  return rowCount > 0;
}

// Materialize Planner subjects/topics into the library.
// Each Planner subject becomes a Subject row; its `topics[]` become Chapters.
async function syncFromPlanner(userId, plannerSubjects) {
  if (!Array.isArray(plannerSubjects) || plannerSubjects.length === 0) {
    return { subjects: [], created: 0 };
  }

  let created = 0;
  for (const ps of plannerSubjects) {
    if (!ps?.name) continue;
    const subject = await createSubject(userId, {
      name: ps.name,
      color: ps.color,
      deadline: ps.deadline,
      priority: ps.priority,
      difficulty: ps.difficulty,
      estimatedHours: ps.estimatedHours,
    });
    created += 1;

    const topics = Array.isArray(ps.topics) ? ps.topics : [];
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      if (typeof topic !== 'string' || !topic.trim()) continue;
      try {
        await createChapter(userId, subject.id, topic.trim(), i);
      } catch (e) {
        console.warn('Sync chapter failed:', e.message);
      }
    }
  }

  return { subjects: await listHierarchy(userId), created };
}

module.exports = {
  listHierarchy,
  createSubject,
  deleteSubject,
  createChapter,
  deleteChapter,
  chapterBelongsToUser,
  syncFromPlanner,
};
