import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUpload, HiOutlineDocument, HiOutlineTrash,
  HiOutlineCheckCircle, HiOutlineExclamationCircle,
  HiOutlineDocumentText, HiOutlineInformationCircle,
  HiOutlineCloudUpload, HiOutlineFolder, HiOutlineDocumentDuplicate,
} from 'react-icons/hi';

import { apiFetch, API_ORIGIN } from '../lib/api';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [serverStatus, setServerStatus] = useState(null); // null | 'ok' | 'error'
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);

  // Check server health and load existing docs on mount
  useEffect(() => {
    checkServer();
  }, []);

  async function checkServer() {
    try {
      const res = await fetch(`${API_ORIGIN}/api/health`);
      const data = await res.json();
      setServerStatus(data);
      if (res.ok) loadDocuments();
    } catch {
      setServerStatus(null);
    }
  }

  async function loadDocuments() {
    try {
      const res = await apiFetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      // server not running — silent fail
    }
  }

  function addNotification(type, message) {
    const id = Date.now();
    setNotifications(prev => [{ id, type, message }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }

  async function uploadFile(file) {
    if (!file) return;

    if (!Object.keys(ALLOWED_TYPES).includes(file.type) && !file.name.match(/\.(pdf|docx?|txt|md)$/i)) {
      addNotification('error', `"${file.name}" is not supported. Upload PDF, DOCX, DOC, TXT, or MD files.`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      addNotification('error', `"${file.name}" is too large. Maximum size is 20 MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(`Processing "${file.name}"...`);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        addNotification('error', data.error || 'Upload failed.');
      } else {
        setDocuments(prev => [data.document, ...prev]);
        addNotification('success', `"${data.document.name}" uploaded — ${data.document.wordCount.toLocaleString()} words indexed.`);
      }
    } catch {
      addNotification('error', 'Could not connect to the backend server. Make sure it is running on port 3001.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function deleteDocument(id, name) {
    try {
      const res = await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        addNotification('success', `"${name}" removed from knowledge base.`);
      }
    } catch {
      addNotification('error', 'Failed to delete document.');
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getFileIcon(name) {
    return <HiOutlineDocumentText style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>My Study Notes</h1>
        <p className="subtitle">Upload your notes and documents — the AI Tutor will answer questions using them</p>
      </div>

      {/* Floating notifications */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 18px', borderRadius: 12,
                background: n.type === 'success' ? 'var(--accent-success)' : '#ef4444',
                color: 'white', fontSize: '0.88rem', fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxWidth: 360,
              }}
            >
              {n.type === 'success' ? <HiOutlineCheckCircle style={{ flexShrink: 0, fontSize: '1.1rem' }} /> : <HiOutlineExclamationCircle style={{ flexShrink: 0, fontSize: '1.1rem' }} />}
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Server status banner */}
      {serverStatus === null && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HiOutlineExclamationCircle style={{ fontSize: '1.3rem', color: '#ef4444', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 2 }}>Backend server is not running</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                Start it with: <code style={{ background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 4 }}>cd server && npm start</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {serverStatus && !serverStatus.groqConfigured && (
        <div className="card" style={{ marginBottom: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <HiOutlineInformationCircle style={{ fontSize: '1.3rem', color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>Groq API key not configured</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You can upload documents, but AI chat won't work until you add your API key.<br />
                1. Get a <strong>free</strong> key at{' '}
                <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>console.groq.com</a><br />
                2. Add it to <code style={{ background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 }}>server/.env</code> as <code style={{ background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 }}>GROQ_API_KEY=your_key</code><br />
                3. Restart the server
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          multiple
          style={{ display: 'none' }}
          onChange={e => Array.from(e.target.files).forEach(uploadFile)}
        />

        {uploading ? (
          <div style={{ textAlign: 'center' }}>
            <div className="upload-spinner" />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--accent-primary)' }}>{uploadProgress}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Parsing and indexing your document...</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, color: dragActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}><HiOutlineCloudUpload /></div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>
              {dragActive ? 'Drop to upload' : 'Upload your study notes'}
            </div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Drag & drop or click to browse
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {['PDF', 'DOCX', 'DOC', 'TXT', 'MD'].map(t => (
                <span key={t} style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: 'var(--bg-glass)', border: '1px solid var(--border-light)',
                  fontSize: '0.75rem', color: 'var(--text-muted)',
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card" style={{ margin: '20px 0', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600, fontSize: '0.9rem' }}>
          <HiOutlineInformationCircle style={{ color: 'var(--accent-primary)' }} /> How RAG works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { step: '1', Icon: HiOutlineCloudUpload, label: 'Upload your notes', desc: 'PDF, Word, or text files' },
            { step: '2', Icon: HiOutlineInformationCircle, label: 'AI indexes content', desc: 'Text is split into searchable chunks' },
            { step: '3', Icon: HiOutlineDocumentDuplicate, label: 'Ask the Tutor', desc: 'Answers come from YOUR notes' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>{s.step}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{s.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1rem' }}>
            Uploaded Documents
            {documents.length > 0 && (
              <span style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 20, background: 'var(--gradient-primary)', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                {documents.length}
              </span>
            )}
          </h3>
          {documents.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {documents.reduce((a, d) => a + (d.wordCount || 0), 0).toLocaleString()} words indexed
            </span>
          )}
        </div>

        <AnimatePresence>
          {documents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state"
              style={{ padding: '40px 20px' }}
            >
              <HiOutlineFolder style={{ fontSize: '2.5rem', color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
              <h3>No documents yet</h3>
              <p>Upload your lecture notes, textbook chapters, or any study material above.<br />The AI Tutor will answer questions directly from your content.</p>
            </motion.div>
          ) : (
            documents.map(doc => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
                style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}
              >
                <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{getFileIcon(doc.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {(doc.wordCount || 0).toLocaleString()} words &nbsp;·&nbsp; {doc.chunkCount} chunks &nbsp;·&nbsp; {formatDate(doc.uploadedAt)}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                  background: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)',
                  border: '1px solid rgba(16,185,129,0.3)', flexShrink: 0,
                }}>
                  Indexed
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={() => deleteDocument(doc.id, doc.name)}
                  title="Remove from knowledge base"
                >
                  <HiOutlineTrash />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          padding: 48px 32px;
          cursor: pointer;
          transition: all var(--transition-normal);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-zone:hover, .upload-zone.drag-active {
          border-color: var(--accent-primary);
          background: rgba(108, 99, 255, 0.05);
        }
        .upload-zone.uploading {
          cursor: not-allowed;
          opacity: 0.8;
        }
        .upload-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
