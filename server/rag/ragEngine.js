const { search, getTotalChunks } = require('./vectorStore');

// Build the system prompt telling the LLM how to behave as a study tutor
const SYSTEM_PROMPT = `You are an intelligent AI study tutor called "LetsStudy AI". Your job is to help students learn and understand their study materials.

When answering questions:
- Be clear, concise, and educational
- If context from the student's notes is provided, base your answer on that context first
- Use simple language with examples where helpful
- Break down complex concepts step by step
- If the question is about something not in the provided context, answer from your general knowledge and mention that
- Format your response with clear structure (use bullet points, numbered lists, or headers when appropriate)
- Keep responses focused and not overly long
- Encourage the student when appropriate`;

function buildRAGPrompt(userMessage, retrievedChunks) {
  if (retrievedChunks.length === 0) {
    return userMessage;
  }

  const contextBlock = retrievedChunks
    .map((chunk, i) => `[From: ${chunk.docName}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  return `The student has uploaded study notes. Here is relevant content from their notes:\n\n${contextBlock}\n\n---\n\nStudent's question: ${userMessage}\n\nPlease answer based on the provided notes context. If the notes don't fully cover the question, supplement with your general knowledge.`;
}

async function getRagContext(query) {
  const totalChunks = getTotalChunks();
  if (totalChunks === 0) return { chunks: [], hasContext: false };

  const chunks = search(query, 5);
  return { chunks, hasContext: chunks.length > 0 };
}

function buildMessages(conversationHistory, userMessage, retrievedChunks) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

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
