const express = require('express');
const Groq = require('groq-sdk');
const { buildMessages, getRagContext } = require('../rag/ragEngine');

const router = express.Router();

let groq = null;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return null;
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, conversationHistory = [] } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured. Please add your API key to server/.env',
      hint: 'Get a free API key at https://console.groq.com',
    });
  }

  try {
    // Retrieve relevant context from uploaded documents
    const { chunks, hasContext } = await getRagContext(message.trim());

    // Build message array with RAG context + conversation history
    const messages = buildMessages(conversationHistory, message.trim(), chunks);

    const completion = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({
      answer,
      hasContext,
      sources: chunks.map(c => ({ docName: c.docName, snippet: c.text.slice(0, 120) + '...' })),
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err) {
    console.error('Groq API error:', err);

    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid Groq API key. Please check your server/.env file.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }

    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
  }
});

// POST /api/chat/generate-quiz
router.post('/generate-quiz', async (req, res) => {
  const { topic, subject, numQuestions = 5 } = req.body;

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured.' });
  }

  const { chunks } = await getRagContext(`${subject} ${topic} questions quiz`);

  const contextText = chunks.length > 0
    ? `Based on these student notes:\n${chunks.map(c => c.text).join('\n\n')}\n\n`
    : '';

  const prompt = `${contextText}Generate exactly ${numQuestions} multiple-choice quiz questions about "${topic}" in ${subject}.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this answer is correct"
  }
]

The "correct" field is the 0-based index of the correct option. Return only the JSON array, no other text.`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a quiz generator. You output ONLY valid JSON arrays. No markdown, no explanation, just the JSON array.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content || '[]';

    // Extract JSON from the response (in case the model adds extra text)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse quiz from AI response.' });
    }

    const questions = JSON.parse(jsonMatch[0]);
    res.json({ questions, topic, subject });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

module.exports = router;
