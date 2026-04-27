const { search, getTotalChunks } = require('./vectorStore');

// Build the system prompt telling the LLM how to behave as a study tutor
const SYSTEM_PROMPT = `You are an intelligent AI study tutor called "LetsStudy AI". Your job is to help students learn and understand their study materials.

When answering questions:
- Be clear, concise, and educational
- Use ONLY the context from the student's uploaded notes
- Do NOT use outside/general knowledge
- If the notes do not contain enough information, explicitly say: "I cannot answer that based on your uploaded documents."
- Use simple language and structure your response clearly
- Format your response with clear structure (use bullet points, numbered lists, or headers when appropriate)
- Keep responses focused and not overly long`;

function buildRAGPrompt(userMessage, retrievedChunks) {
  if (retrievedChunks.length === 0) {
    return userMessage;
  }

  const contextBlock = retrievedChunks
    .map((chunk, i) => `[From: ${chunk.docName}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  return `The student has uploaded study notes. Here is relevant content from their notes:\n\n${contextBlock}\n\n---\n\nStudent's question: ${userMessage}\n\nAnswer ONLY from the provided notes context. If the context is insufficient, respond exactly with: "I cannot answer that based on your uploaded documents."`;
}

async function getRagContext(query, userId, documentIds = null) {
  const totalChunks = getTotalChunks(userId, documentIds);
  if (totalChunks === 0) return { chunks: [], hasContext: false };

  // Slightly more retrieved chunks when scoping across many documents.
  const k = Array.isArray(documentIds) && documentIds.length > 1 ? 8 : 5;
  const chunks = search(userId, query, k, documentIds);
  return { chunks, hasContext: chunks.length > 0 };
}

function buildMessages(conversationHistory, userMessage, retrievedChunks, options = {}) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Cross-agent "baton pass": shared roadmap context from the Planner & Evaluator.
  // Injected as a second system message so it doesn't dilute RAG instructions.
  if (options.briefing && typeof options.briefing === 'string' && options.briefing.trim()) {
    messages.push({ role: 'system', content: options.briefing.trim() });
  }

  // Include last 6 turns of conversation for context (keep token usage manageable)
  const recentHistory = conversationHistory.slice(-12);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content || msg.text || '' });
    }
  }

  // Add current message with RAG context injected
  const promptWithContext = buildRAGPrompt(userMessage, retrievedChunks);
  messages.push({ role: 'user', content: promptWithContext });

  return messages;
}

module.exports = { buildMessages, getRagContext, SYSTEM_PROMPT };
