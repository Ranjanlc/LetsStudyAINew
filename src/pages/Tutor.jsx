import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { tutorAgent } from "../agents/tutorAgent";
import { motion } from "framer-motion";
import {
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineExclamationCircle,
  HiOutlineAcademicCap,
} from "react-icons/hi";
import { apiFetch, API_ORIGIN } from "../lib/api";

export default function Tutor() {
  const { state, dispatch } = useApp();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null); // null | { groqConfigured, docCount, model }
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory, isLoading]);

  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const [healthRes, docsRes] = await Promise.all([
        fetch(`${API_ORIGIN}/api/health`),
        apiFetch("/api/documents"),
      ]);
      const health = await healthRes.json();
      const docs = docsRes.ok ? await docsRes.json() : { documents: [] };
      const docList = docs.documents || [];
      setDocuments(docList);
      setSelectedDocId((prev) => {
        if (prev && docList.some((d) => d.id === prev)) return prev;
        return docList[0]?.id || "";
      });
      setBackendStatus({
        groqConfigured: health.groqConfigured,
        docCount: docList.length,
        model: health.model,
      });
    } catch {
      setBackendStatus(null);
      setDocuments([]);
      setSelectedDocId("");
    }
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    if (!selectedDocId) {
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: {
          id: Date.now() + 1,
          role: "assistant",
          text: "Please select a document first. This tutor only answers from the selected document.",
          type: "error",
          time: new Date().toISOString(),
        },
      });
      return;
    }

    const userMsg = message.trim();
    dispatch({
      type: "ADD_CHAT_MESSAGE",
      payload: {
        id: Date.now(),
        role: "user",
        text: userMsg,
        time: new Date().toISOString(),
      },
    });
    setMessage("");
    setIsLoading(true);

    try {
      const response = await tutorAgent.getChatResponseAI(
        userMsg,
        state.chatHistory,
        selectedDocId,
      );
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: {
          id: Date.now() + 1,
          role: "assistant",
          text: response.text,
          type: response.type,
          hasContext: response.hasContext,
          sources: response.sources,
          model: response.model,
          time: new Date().toISOString(),
        },
      });
    } catch (err) {
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: {
          id: Date.now() + 1,
          role: "assistant",
          text: `**Error:** ${err.message || "Something went wrong. Please try again."}`,
          type: "error",
          time: new Date().toISOString(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (s) => {
    setMessage(s);
    setTimeout(() => document.querySelector(".chat-input")?.focus(), 0);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>Tutor Agent</h1>
        <p className="subtitle">Strict document-only tutor. Answers come only from your uploaded notes.</p>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: "12px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HiOutlineSparkles style={{ color: "var(--accent-primary)" }} />
            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
              Document-only Mode (RAG)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
            {backendStatus === null && (
              <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                <HiOutlineExclamationCircle /> Backend unavailable
              </span>
            )}
            {backendStatus && !backendStatus.groqConfigured && (
              <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                <HiOutlineExclamationCircle /> GROQ_API_KEY missing in server/.env
              </span>
            )}
            {backendStatus?.groqConfigured && (
              <span style={{ color: "var(--accent-success)", display: "flex", alignItems: "center", gap: 4 }}>
                ✓ {backendStatus.model} · {backendStatus.docCount} document{backendStatus.docCount !== 1 ? "s" : ""} indexed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: "12px 18px" }}>
        <label style={{ display: "block", fontSize: "0.82rem", marginBottom: 6, color: "var(--text-muted)" }}>
          Active document for Tutor chat
        </label>
        <select
          className="form-control"
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          disabled={isLoading || documents.length === 0}
        >
          {documents.length === 0 ? (
            <option value="">No documents available</option>
          ) : (
            documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {state.chatHistory.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <HiOutlineAcademicCap />
              </div>
              <h3>Welcome to the Document Tutor</h3>
              <p>
                {backendStatus?.docCount > 0
                  ? "Ask questions only from the selected document."
                  : "Upload notes in Documents first. This tutor will not answer outside your uploaded content."}
              </p>
              <div className="chat-suggestions">
                {[
                  "Summarize the key ideas in my notes",
                  "What does my document say about this topic?",
                  "List the important definitions from my notes",
                  "Create a concise revision summary from my uploaded notes",
                ].map((s) => (
                  <button key={s} className="chip" onClick={() => handleSuggestionClick(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.chatHistory.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="chat-avatar">{msg.role === "user" ? state.user.avatar : "🤖"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chat-bubble">
                  <div className="chat-text" dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                  <div className="chat-time">
                    {new Date(msg.time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.model && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {msg.model}</span>}
                  </div>
                </div>

                {msg.role === "assistant" && msg.hasContext && msg.sources?.length > 0 && (
                  <div className="sources-bar">
                    <span style={{ fontWeight: 600, marginRight: 6 }}>Sources:</span>
                    {msg.sources.map((s, i) => (
                      <span key={i} className="source-chip" title={s.snippet}>
                        📄 {s.docName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="chat-avatar">🤖</div>
              <div className="chat-bubble typing-bubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <form className="chat-input-container" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder={
              selectedDocId
                ? "Ask a question based only on the selected document..."
                : "Select a document first..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading || !selectedDocId}
          />
          <button
            type="submit"
            className="btn btn-primary btn-icon chat-send"
            disabled={!message.trim() || isLoading || !selectedDocId}
          >
            <HiOutlinePaperAirplane />
          </button>
        </form>

        {state.chatHistory.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "8px" }}
            onClick={() => dispatch({ type: "CLEAR_CHAT" })}
          >
            <HiOutlineTrash /> Clear Chat
          </button>
        )}
      </div>

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
          font-size: 2.5rem;
          margin-bottom: 12px;
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
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
          background: var(--bg-secondary);
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
          background: rgba(123,97,255,0.1); border: 1px solid rgba(123,97,255,0.25);
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
      `}</style>
    </motion.div>
  );
}

function formatMessage(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*?)$/gm, "<li>$1</li>")
    .replace(/^• (.*?)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(
      /`(.*?)`/g,
      '<code style="background:var(--bg-glass);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>',
    )
    .replace(/<\/h[23]><br\/>/g, "</h2>")
    .replace(/<\/li><br\/>/g, "</li>");
}
