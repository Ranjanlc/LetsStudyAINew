import { apiFetch } from '../lib/api';

export const tutorAgent = {
  name: 'Tutor Agent',
  description: 'Answers only from the user uploaded documents.',

  async getChatResponseAI(message, conversationHistory = [], documentIds = []) {
    const history = conversationHistory
      .slice(-12)
      .map(m => ({ role: m.role, content: m.text || m.content || '' }));

    const ids = Array.isArray(documentIds) ? documentIds : [documentIds].filter(Boolean);

    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: { message, conversationHistory: history, documentIds: ids },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to get AI response');
    }

    return {
      text: data.answer,
      type: 'ai',
      hasContext: data.hasContext,
      sources: data.sources || [],
      model: data.model,
    };
  },
};
