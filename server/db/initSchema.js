const { getPool } = require('./pool');

const SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_app_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  deadline DATE,
  priority TEXT,
  difficulty TEXT,
  estimated_hours INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_user_name ON subjects(user_id, lower(name));

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chapters_subject_name ON chapters(subject_id, lower(name));

CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  word_count INT,
  chunk_count INT NOT NULL DEFAULT 0,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_chapter_id ON user_documents(chapter_id);
`;

async function initSchema() {
  const pool = getPool();
  await pool.query(SQL);
}

module.exports = { initSchema };
