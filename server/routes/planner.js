const express = require('express');
const Groq = require('groq-sdk');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

let groq = null;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') return null;
    groq = new Groq({ apiKey });
  }
  return groq;
}

// POST /api/planner/generate
// AI-powered study schedule generation
router.post('/generate', async (req, res) => {
  const { subjects } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'subjects array is required' });
  }

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: 'GROQ_API_KEY not configured', fallback: true });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const subjectSummary = subjects.map(s => ({
    id: s.id,
    name: s.name,
    priority: s.priority,
    deadline: s.deadline,
    topics: s.topics,
    color: s.color,
  }));

  const prompt = `You are a smart study schedule optimizer. Today is ${todayStr}.

Student's subjects to study:
${JSON.stringify(subjectSummary, null, 2)}

Create an optimized daily study schedule. Rules:
- Only schedule sessions from ${todayStr} onwards (no past dates)
- High priority subjects: 3 hours/session. Medium: 2 hours. Low: 1 hour.
- Spread each subject's topics evenly across the available days before its deadline
- Add exactly 1 revision session per subject, scheduled 1 day before its deadline
- Do NOT schedule more than 6 total study hours on any single day
- Use the EXACT subjectId and color from the input

Return ONLY a valid JSON array, no markdown fences, no explanations:
[
  {
    "id": "sub-xxx-0",
    "subjectId": "sub-xxx",
    "subjectName": "Subject Name",
    "topic": "Topic Name",
    "date": "YYYY-MM-DD",
    "duration": 2,
    "priority": "medium",
    "completed": false,
    "type": "study",
    "color": "#hexcolor"
  }
]`;

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [
        {
          role: 'system',
          content: 'You are a study schedule generator. Output ONLY a valid JSON array. No markdown code fences, no explanations, just the raw JSON array.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content || '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse AI schedule', fallback: true });
    }

    const tasks = JSON.parse(jsonMatch[0]);
    tasks.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ tasks, aiGenerated: true });
  } catch (err) {
    console.error('Planner AI generate error:', err);
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached', fallback: true });
    }
    res.status(500).json({ error: 'AI generation failed', fallback: true });
  }
});

// POST /api/planner/insights
// Returns a short personalized coaching message for the student
router.post('/insights', async (req, res) => {
  const { subjects, studyPlan } = req.body;

  if (!subjects || subjects.length === 0) {
    return res.status(400).json({ error: 'subjects required' });
  }

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: 'GROQ_API_KEY not configured' });
  }

  const today = new Date().toISOString().split('T')[0];
  const completed = studyPlan ? studyPlan.filter(t => t.completed).length : 0;
  const total = studyPlan ? studyPlan.length : 0;

  // Find most urgent subject (earliest deadline)
  const upcoming = subjects
    .map(s => ({ ...s, daysLeft: Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24)) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const prompt = `You are an encouraging study coach. Today is ${today}.

Student subjects: ${subjects.map(s => `${s.name} (${s.priority} priority, deadline: ${s.deadline})`).join(', ')}
Study progress: ${completed} of ${total} tasks completed (${total > 0 ? Math.round((completed / total) * 100) : 0}%)
Most urgent: ${upcoming[0]?.name || 'none'} (${upcoming[0]?.daysLeft ?? 0} days left)

Give a brief, personalized coaching response in this exact JSON format:
{
  "summary": "One sentence about their overall study situation",
  "urgentSubject": "${upcoming[0]?.name || null}",
  "encouragement": "One motivating sentence tailored to their progress",
  "recommendation": "One specific actionable thing they should do today"
}

Return ONLY the JSON object. No markdown, no extra text.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Output ONLY valid JSON. No markdown fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Parse error' });

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Planner insights error:', err);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// POST /api/planner/objectives
// Generates per-topic "learning objectives" for the supplied subjects.
// These are persisted by the Planner page into user_app_state.learningObjectives
// and read by the Tutor + Evaluator at agent time (see services/agentContext.js).
router.post('/objectives', async (req, res) => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'subjects array is required' });
  }

  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: 'GROQ_API_KEY not configured', fallback: true });
  }

  // Cap input size — we only need topic names + subject context.
  const trimmed = subjects.slice(0, 8).map(s => ({
    name: s.name,
    topics: Array.isArray(s.topics) ? s.topics.slice(0, 12) : [],
  }));

  const prompt = `You are a curriculum designer. For each topic in each subject below, write 3 concise, measurable learning objectives a student should achieve to consider the topic mastered.

Subjects:
${JSON.stringify(trimmed, null, 2)}

Output ONLY a valid JSON object of this shape (no markdown, no commentary):
{
  "TopicNameLower": {
    "topic": "Topic Name",
    "subject": "Subject Name",
    "objectives": ["Objective 1", "Objective 2", "Objective 3"]
  }
}

Use the topic name lowercased (no leading/trailing spaces) as the key. Keep each objective under 18 words. Make them concrete and testable (e.g., "Explain how X causes Y", "Apply formula Z to solve a problem").`;

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [
        {
          role: 'system',
          content:
            'You write structured curriculum learning objectives. Output ONLY a JSON object as described. No markdown fences, no commentary.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2200,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse objectives', fallback: true });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    // Normalize: ensure keys are lowercased trimmed topic names and shape is consistent.
    const objectives = {};
    for (const [rawKey, val] of Object.entries(parsed)) {
      if (!val || typeof val !== 'object') continue;
      const topic = String(val.topic || rawKey || '').trim();
      if (!topic) continue;
      const list = Array.isArray(val.objectives) ? val.objectives.filter(Boolean).map(String) : [];
      if (list.length === 0) continue;
      objectives[topic.toLowerCase()] = {
        topic,
        subject: String(val.subject || '').trim() || null,
        objectives: list.slice(0, 5),
      };
    }

    res.json({ objectives });
  } catch (err) {
    console.error('Planner objectives error:', err);
    if (err.status === 429) return res.status(429).json({ error: 'Rate limit reached', fallback: true });
    res.status(500).json({ error: 'Failed to generate objectives', fallback: true });
  }
});

module.exports = router;
