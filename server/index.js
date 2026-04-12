require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatRouter = require('./routes/chat');
const documentsRouter = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);

// Health check
app.get('/api/health', (req, res) => {
  const hasApiKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
  res.json({
    status: 'ok',
    groqConfigured: hasApiKey,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    message: hasApiKey
      ? 'Server is ready. Groq API key is configured.'
      : 'Server running but GROQ_API_KEY is not set. Add it to server/.env',
  });
});

app.listen(PORT, () => {
  console.log(`\n LetsStudyAI backend running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    console.log('\n  WARNING: GROQ_API_KEY is not set!');
    console.log('  Get a free key at: https://console.groq.com');
    console.log('  Then add it to server/.env\n');
  } else {
    console.log(' Groq API key loaded. AI features are active!\n');
  }
});
