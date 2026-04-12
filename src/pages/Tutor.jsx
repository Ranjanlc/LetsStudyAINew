import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { tutorAgent } from '../agents/tutorAgent';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePaperAirplane, HiOutlineTrash, HiOutlineBookOpen,
  HiOutlineLightBulb, HiOutlineChevronRight, HiOutlineSparkles,
  HiOutlineDatabase, HiOutlineExclamationCircle,
} from 'react-icons/hi';

const API_BASE = 'http://localhost:3001/api';

export default function Tutor() {
  const { state, dispatch } = useApp();
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAiMode] = useState(true); // true = use Groq API, false = offline fallback
  const [backendStatus, setBackendStatus] = useState(null); // null | { groqConfigured, docCount }
  const chatEndRef = useRef(null);

  const subjects = tutorAgent.getSubjects();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory, isLoading]);

  // Check backend health on mount
  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const [healthRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/documents`),
      ]);
      const health = await healthRes.json();
      const docs = await docsRes.json();
      setBackendStatus({
        groqConfigured: health.groqConfigured,
        docCount: docs.documents?.length || 0,
        model: health.model,
      });
    } catch {
      setBackendStatus(null);
      setAiMode(false); // Auto-switch to offline if backend is down
    }
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMsg = message.trim();
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: { id: Date.now(), role: 'user', text: userMsg, time: new Date().toISOString() },
    });
    setMessage('');
    setIsLoading(true);

    try {
      if (aiMode && backendStatus !== null) {
        // Use real AI via backend
        const response = await tutorAgent.getChatResponseAI(userMsg, state.chatHistory);
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            id: Date.now() + 1,
            role: 'assistant',
            text: response.text,
            type: response.type,
            hasContext: response.hasContext,
            sources: response.sources,
            model: response.model,
            time: new Date().toISOString(),
          },
        });
      } else {
        // Offline fallback — hardcoded knowledge base
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
        const response = tutorAgent.getChatResponse(userMsg, state.chatHistory);
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            id: Date.now() + 1,
            role: 'assistant',
            text: response.text,
            type: response.type,
            offline: true,
            time: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: Date.now() + 1,
          role: 'assistant',
          text: `**Error:** ${err.message || 'Something went wrong. Please try again.'}`,
          type: 'error',
          time: new Date().toISOString(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicClick = (subject, topic) => {
    setSelectedSubject(subject);
    setSelectedTopic(topic);
    setActiveTab('explore');
  };

  const handleSuggestionClick = (s) => {
    setMessage(s);
    setTimeout(() => document.querySelector('.chat-input')?.focus(), 0);
  };

  const explanation = selectedSubject && selectedTopic
    ? tutorAgent.getExplanation(selectedSubject, selectedTopic)
    : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>🎓 Tutor Agent</h1>
        <p className="subtitle">Learn concepts interactively, ask questions, and explore topics</p>
      </div>

      {/* AI Mode toggle bar */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: aiMode && backendStatus ? 'var(--accent-primary)' : 'var(--border-color)',
              position: 'relative', cursor: backendStatus ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }} onClick={() => backendStatus && setAiMode(m => !m)}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: aiMode && backendStatus ? 19 : 3,
                transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
              {aiMode && backendStatus ? (
                <><HiOutlineSparkles style={{ verticalAlign: 'middle', color: 'var(--accent-primary)', marginRight: 4 }} />AI Mode (Groq + RAG)</>
              ) : (
                <><HiOutlineDatabase style={{ verticalAlign: 'middle', opacity: 0.5, marginRight: 4 }} />Offline Mode</>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
            {backendStatus === null && (
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HiOutlineExclamationCircle /> Server offline — using built-in knowledge base
              </span>
            )}
            {backendStatus && !backendStatus.groqConfigured && (
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HiOutlineExclamationCircle /> API key missing — add GROQ_API_KEY to server/.env
              </span>
            )}
            {backendStatus?.groqConfigured && (
              <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                ✓ {backendStatus.model} &nbsp;·&nbsp; {backendStatus.docCount} document{backendStatus.docCount !== 1 ? 's' : ''} indexed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 Chat
        </button>
        <button className={`tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
          📖 Browse Topics
        </button>
        <button className={`tab ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
          🔍 Explore
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="chat-container">
              <div className="chat-messages">
                {state.chatHistory.length === 0 && (
                  <div className="chat-welcome">
                    <div className="chat-welcome-icon">🎓</div>
                    <h3>Welcome to the AI Tutor!</h3>
                    <p>
                      {aiMode && backendStatus?.docCount > 0
                        ? `I have access to ${backendStatus.docCount} of your documents. Ask me anything!`
                        : 'Ask me about any topic. Upload your notes in the Documents page for personalized answers.'}
                    </p>
                    <div className="chat-suggestions">
                      {['What is Algebra?', 'Explain Data Structures', 'Tell me about Genetics', "How does Newton's 2nd Law work?"].map(s => (
                        <button key={s} className="chip" onClick={() => handleSuggestionClick(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {state.chatHistory.map(msg => (
                  <div key={msg.id} className={`chat-message ${msg.role}`}>
                    <div className="chat-avatar">
                      {msg.role === 'user' ? state.user.avatar : '🤖'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="chat-bubble">
                        <div className="chat-text" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                        <div className="chat-time">
                          {new Date(msg.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.model && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {msg.model}</span>}
                          {msg.offline && <span style={{ marginLeft: 6, opacity: 0.6 }}>· offline</span>}
                        </div>
                      </div>
                      {/* Show RAG sources if available */}
                      {msg.role === 'assistant' && msg.hasContext && msg.sources?.length > 0 && (
                        <div className="sources-bar">
                          <span style={{ fontWeight: 600, marginRight: 6 }}>Sources:</span>
                          {msg.sources.map((s, i) => (
                            <span key={i} className="source-chip" title={s.snippet}>📄 {s.docName}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="chat-message assistant">
                    <div className="chat-avatar">🤖</div>
                    <div className="chat-bubble typing-bubble">
                      <span /><span /><span />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <form className="chat-input-container" onSubmit={handleSend}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder={aiMode && backendStatus ? 'Ask AI anything about your studies...' : 'Ask about any topic...'}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" className="btn btn-primary btn-icon chat-send" disabled={!message.trim() || isLoading}>
                  <HiOutlinePaperAirplane />
                </button>
              </form>

              {state.chatHistory.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => dispatch({ type: 'CLEAR_CHAT' })}
                >
                  <HiOutlineTrash /> Clear Chat
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'browse' && (
          <motion.div key="browse" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid-auto">
              {subjects.map(subject => {
                const topics = tutorAgent.getTopics(subject);
                const subjectEmojis = {
                  Mathematics: '📐', Science: '🔬', 'Computer Science': '💻',
                  Physics: '⚡', Chemistry: '🧪', Biology: '🧬',
                };
                return (
                  <div key={subject} className="card" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{subjectEmojis[subject] || '📖'}</span>
                      <h3 style={{ fontSize: '1.1rem' }}>{subject}</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {topics.map(topic => (
                        <button
                          key={topic}
                          className="topic-button"
                          onClick={() => handleTopicClick(subject, topic)}
                        >
                          <HiOutlineBookOpen style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                          <span>{topic}</span>
                          <HiOutlineChevronRight style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.4 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'explore' && (
          <motion.div key="explore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!explanation ? (
              <div className="empty-state">
                <div className="emoji">🔍</div>
                <h3>Select a topic to explore</h3>
                <p>Go to "Browse Topics" and click on any topic to see detailed explanations.</p>
              </div>
            ) : (
              <div className="explanation-view">
                <div className="card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{selectedSubject}</span>
                    <HiOutlineChevronRight />
                    <span style={{ color: 'var(--accent-primary)' }}>{selectedTopic}</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{selectedTopic}</h2>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                    {explanation.summary}
                  </p>
                </div>

                <div className="grid-2" style={{ alignItems: 'start' }}>
                  <div className="card">
                    <div className="section-title"><HiOutlineLightBulb className="icon" /> Key Points</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {explanation.keyPoints.map((point, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                          padding: '12px', background: 'var(--bg-glass)',
                          border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                        }}>
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, color: 'white',
                          }}>{i + 1}</span>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div className="section-title">📝 Examples</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {explanation.examples.map((ex, i) => (
                        <div key={i} style={{
                          padding: '16px', background: 'var(--bg-glass)',
                          border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px', color: 'var(--accent-secondary)' }}>
                            Q: {ex.problem}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                            A: {ex.solution}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
        }
        .chat-messages {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: 24px;
          min-height: 400px;
          max-height: 520px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chat-welcome {
          text-align: center;
          padding: 40px 20px;
        }
        .chat-welcome-icon {
          font-size: 3rem;
          margin-bottom: 12px;
          animation: float 4s ease-in-out infinite;
        }
        .chat-welcome h3 { font-size: 1.2rem; margin-bottom: 8px; }
        .chat-welcome p { color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem; }
        .chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
        }
        .chat-suggestions .chip {
          cursor: pointer;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          font-family: var(--font-body);
        }
        .chat-suggestions .chip:hover {
          background: var(--bg-glass-hover);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .chat-message {
          display: flex;
          gap: 10px;
          max-width: 88%;
          animation: fadeInUp 0.3s ease;
        }
        .chat-message.user { flex-direction: row-reverse; align-self: flex-end; }
        .chat-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 16px;
          background: var(--bg-glass); border: 1px solid var(--border-light);
        }
        .chat-bubble {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          line-height: 1.6;
        }
        .chat-message.user .chat-bubble {
          background: var(--gradient-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .chat-message.assistant .chat-bubble {
          background: var(--bg-glass);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }
        .chat-text h2 { font-size: 1rem; margin-bottom: 8px; color: var(--accent-secondary); }
        .chat-text h3 { font-size: 0.9rem; margin: 10px 0 6px; color: var(--accent-primary); }
        .chat-text p { margin: 6px 0; }
        .chat-text ul, .chat-text ol { padding-left: 20px; margin: 6px 0; }
        .chat-text li { margin: 3px 0; }
        .chat-time { font-size: 0.65rem; color: var(--text-muted); margin-top: 4px; opacity: 0.7; }
        .chat-message.user .chat-time { text-align: right; color: rgba(255,255,255,0.6); }
        .typing-bubble {
          display: flex; gap: 5px; align-items: center; padding: 14px 18px;
        }
        .typing-bubble span {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent-primary); opacity: 0.6;
          animation: typingDot 1.2s infinite;
        }
        .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
        .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        .sources-bar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
          margin-top: 6px; font-size: 0.72rem; color: var(--text-muted);
        }
        .source-chip {
          padding: 2px 8px; border-radius: 10;
          background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.25);
          color: var(--accent-primary); border-radius: 20px;
          cursor: default; font-size: 0.72rem;
        }
        .chat-input-container {
          display: flex; gap: 8px; padding: 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color); border-top: none;
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }
        .chat-input {
          flex: 1; padding: 12px 16px;
          background: var(--bg-glass); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-primary);
          font-family: var(--font-body); font-size: 0.9rem;
          outline: none; transition: border-color var(--transition-fast);
        }
        .chat-input:focus { border-color: var(--accent-primary); }
        .chat-input::placeholder { color: var(--text-muted); }
        .chat-input:disabled { opacity: 0.6; }
        .chat-send { width: 46px; height: 46px; border-radius: var(--radius-md); font-size: 1.1rem; }

        .topic-button {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; background: var(--bg-glass);
          border: 1px solid var(--border-light); border-radius: var(--radius-md);
          color: var(--text-secondary); cursor: pointer;
          transition: all var(--transition-normal);
          font-family: var(--font-body); font-size: 0.85rem;
          text-align: left; width: 100%;
        }
        .topic-button:hover {
          background: var(--bg-glass-hover);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }
      `}</style>
    </motion.div>
  );
}

function formatMessage(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/^• (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-glass);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
    .replace(/<\/h[23]><br\/>/g, '</h2>')
    .replace(/<\/li><br\/>/g, '</li>');
}
