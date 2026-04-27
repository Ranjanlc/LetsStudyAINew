const express = require('express');
const Groq = require('groq-sdk');
const { buildMessages, getRagContext } = require('../rag/ragEngine');
const { getDocumentChunks } = require('../rag/vectorStore');
const { requireAuth } = require('../middleware/auth');
const {
  ensureUserDocumentsIndexed,
  userOwnedDocumentIds,
} = require('../services/documentIndex');
const {
  loadUserAppState,
  buildTutorBriefing,
  buildEvaluatorBriefing,
} = require('../services/agentContext');

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

router.use(requireAuth);

// Accept both legacy `documentId` (string) and new `documentIds` (array).
function extractDocumentIds(body) {
  const ids = [];
  if (Array.isArray(body?.documentIds)) {
    for (const id of body.documentIds) {
      if (typeof id === 'string' && id.trim()) ids.push(id.trim());
    }
  }
  if (typeof body?.documentId === 'string' && body.documentId.trim()) {
    ids.push(body.documentId.trim());
  }
  return Array.from(new Set(ids));
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
    await ensureUserDocumentsIndexed(req.user.id);

    const requestedIds = extractDocumentIds(req.body);
    let activeIds = [];
    if (requestedIds.length > 0) {
      activeIds = await userOwnedDocumentIds(req.user.id, requestedIds);
      if (activeIds.length === 0) {
        return res.status(404).json({ error: 'None of the selected documents were found.' });
      }
    }

    const filter = activeIds.length > 0 ? activeIds : null;
    let { chunks, hasContext } = await getRagContext(message.trim(), req.user.id, filter);

    // If we have a strict scope but the keyword retrieval came up empty,
    // fall back to including the first few chunks of each scoped document.
    if (filter && !hasContext) {
      const fallback = [];
      for (const id of activeIds) {
        const docChunks = getDocumentChunks(req.user.id, id);
        fallback.push(...docChunks.slice(0, 3));
        if (fallback.length >= 8) break;
      }
      if (fallback.length > 0) {
        chunks = fallback.slice(0, 8);
        hasContext = true;
      }
    }

    // Baton pass: pull the user's roadmap context (Planner state + Evaluator
    // weak/mastered topics) and inject it as a system briefing for the Tutor.
    let briefing = '';
    try {
      const appState = await loadUserAppState(req.user.id);
      briefing = buildTutorBriefing(appState);
    } catch (e) {
      console.warn('Tutor briefing unavailable:', e.message);
    }

    const messages = buildMessages(conversationHistory, message.trim(), chunks, { briefing });

    const completion = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
      activeDocumentIds: activeIds,
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
  const { topic, subject, numQuestions = 5, focusTopic } = req.body;

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured.' });
  }

  let contextText = '';
  let quizTopic = topic || focusTopic || 'the documents';
  let quizSubject = subject || 'Study Notes';
  let sourceDocs = [];

  await ensureUserDocumentsIndexed(req.user.id);

  const requestedIds = extractDocumentIds(req.body);
  let activeIds = [];
  if (requestedIds.length > 0) {
    activeIds = await userOwnedDocumentIds(req.user.id, requestedIds);
    if (activeIds.length === 0) {
      return res.status(404).json({ error: 'None of the selected documents were found.' });
    }
  }

  if (activeIds.length > 0) {
    // Build context from the selected documents directly, capped to keep within token limits.
    const allChunks = [];
    for (const id of activeIds) {
      const docChunks = getDocumentChunks(req.user.id, id);
      if (docChunks.length === 0) continue;
      sourceDocs.push(docChunks[0].docName);
      allChunks.push({ docName: docChunks[0].docName, text: docChunks.map(c => c.text).join('\n\n') });
    }
    if (allChunks.length === 0) {
      return res.status(404).json({ error: 'Selected documents have no indexed content.' });
    }

    const blended = allChunks.map(c => `=== ${c.docName} ===\n${c.text}`).join('\n\n');
    const trimmed = blended.length > 6000 ? blended.slice(0, 6000) + '...' : blended;

    quizTopic = focusTopic || (sourceDocs.length === 1 ? sourceDocs[0] : `${sourceDocs.length} documents`);
    quizSubject = 'Document Quiz';
    contextText = `You are generating quiz questions STRICTLY based on the following document content.\n\nDocuments: ${sourceDocs.map(n => `"${n}"`).join(', ')}\n\nContent:\n${trimmed}\n\n`;
  } else {
    const { chunks } = await getRagContext(`${subject} ${topic} questions quiz`, req.user.id);
    if (chunks.length > 0) {
      contextText = `Use these relevant student notes as additional context:\n${chunks.map(c => c.text).join('\n\n')}\n\n`;
    }
  }

  const focusLine = focusTopic ? `Focus specifically on the subtopic: "${focusTopic}".` : '';

  // Baton pass: surface Planner-defined learning objectives + previously weak
  // topics so the generated quiz aligns with the roadmap and reinforces gaps.
  let evaluatorBriefing = '';
  try {
    const appState = await loadUserAppState(req.user.id);
    evaluatorBriefing = buildEvaluatorBriefing(appState, focusTopic || quizTopic);
  } catch (e) {
    console.warn('Evaluator briefing unavailable:', e.message);
  }
  const briefingBlock = evaluatorBriefing ? `\n${evaluatorBriefing}\n\n` : '';

  const prompt = `${contextText}${briefingBlock}Generate exactly ${numQuestions} multiple-choice quiz questions${activeIds.length > 0 ? ' based ONLY on the document content above' : ` about "${quizTopic}" in ${quizSubject}`}. ${focusLine}

Rules:
- All questions and answers must come from the provided content only (if document mode)
- Each question must have exactly 4 answer options
- Only one option should be correct
- For EVERY question, the "explanation" field must clearly justify why the correct answer is right (and reference the source content when applicable). The explanation will be shown to the student immediately after they answer.
- Include a "topic" field on each question naming the specific subtopic it tests (use one of the learning objectives above when possible). This lets the Planner know which topics need more reinforcement.

Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this answer is correct, referencing the document if relevant",
    "topic": "Subtopic this question tests"
  }
]

The "correct" field is the 0-based index of the correct option. Return only the JSON array, no other text.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a quiz generator. You output ONLY valid JSON arrays. No markdown, no explanation, just the JSON array. Every question MUST include a non-empty "explanation" field.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content || '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse quiz from AI response.' });
    }

    const questions = JSON.parse(jsonMatch[0]).map(q => ({
      ...q,
      explanation: q.explanation || 'No explanation provided for this question.',
      topic: (q.topic && String(q.topic).trim()) || focusTopic || quizTopic,
    }));

    res.json({
      questions,
      topic: quizTopic,
      subject: quizSubject,
      sourceDocs,
      sourceDoc: sourceDocs[0] || null, // back-compat for older UI
      activeDocumentIds: activeIds,
    });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

module.exports = router;
