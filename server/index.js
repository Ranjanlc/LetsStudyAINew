require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./db/initSchema');
const { getPool } = require('./db/pool');

const chatRouter = require('./routes/chat');
const documentsRouter = require('./routes/documents');
const plannerRouter = require('./routes/planner');
const authRouter = require('./routes/auth');
const userStateRouter = require('./routes/userState');

const app = express();
const PORT = process.env.PORT || 3001;

function assertEnv() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Add it to server/.env (see server/.env.example).');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error('JWT_SECRET is required and must be at least 16 characters.');
    process.exit(1);
  }
}

assertEnv();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/user', userStateRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/planner', plannerRouter);

app.get('/api/health', async (req, res) => {
  const hasApiKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
  let database = false;
  try {
    await getPool().query('SELECT 1');
    database = true;
  } catch (e) {
    console.error('Database health check failed:', e.message);
  }
  res.json({
    status: 'ok',
    groqConfigured: hasApiKey,
    database,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    message: hasApiKey
      ? 'Server is ready. Groq API key is configured.'
      : 'Server running but GROQ_API_KEY is not set. Add it to server/.env',
  });
});

async function start() {
  try {
    await initSchema();
    console.log('Database schema ready.');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n LetsStudyAI backend running on http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      console.log('\n  WARNING: GROQ_API_KEY is not set! Get a free key at https://console.groq.com\n');
    } else {
      console.log(' Groq API key loaded. AI features are active!\n');
    }
  });
}

start();
