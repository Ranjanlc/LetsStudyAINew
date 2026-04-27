import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineTrash,
  HiOutlineCheckCircle, HiOutlineExclamationCircle,
  HiOutlineDocumentText, HiOutlineInformationCircle,
  HiOutlineCloudUpload, HiOutlineFolder, HiOutlineDocumentDuplicate,
  HiOutlineRefresh,
} from 'react-icons/hi';

import { apiFetch, API_ORIGIN } from '../lib/api';
import { fetchHierarchy, syncFromPlanner } from '../lib/library';
import { useApp } from '../context/AppContext';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

export default function Documents() {
  const { state, dispatch } = useApp();
  const library = state.library;

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const fileInputRef = useRef(null);

  // ── boot ───────────────────────────────────────────────────────────────
  useEffect(() => { checkServer(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reloadLibrary(); }, []);

  async function checkServer() {
    try {
      const res = await fetch(`${API_ORIGIN}/api/health`);
      const data = await res.json();
      setServerStatus(data);
    } catch {
      setServerStatus(null);
    }
  }

  async function reloadLibrary() {
    setLoadingLib(true);
    try {
      const subjects = await fetchHierarchy();
      dispatch({ type: 'SET_LIBRARY', payload: subjects });

      // First-time UX: if the user has Planner subjects but no library yet, auto-sync silently.
      if (subjects.length === 0 && (state.subjects?.length || 0) > 0) {
        try {
          const synced = await syncFromPlanner(state.subjects);
          dispatch({ type: 'SET_LIBRARY', payload: synced.subjects || [] });
          addNotification('success', `Imported ${state.subjects.length} subject(s) from your Planner.`);
        } catch (e) {
          // non-fatal
          console.warn('Auto-sync from planner failed:', e.message);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLib(false);
    }
  }

  function addNotification(type, message) {
    const id = Date.now();
    setNotifications(prev => [{ id, type, message }, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }

  // ── selection helpers ─────────────────────────────────────────────────
  const currentSubject = useMemo(
    () => library.find(s => s.id === selectedSubjectId) || null,
    [library, selectedSubjectId],
  );
  const currentChapter = useMemo(
    () => currentSubject?.chapters.find(c => c.id === selectedChapterId) || null,
    [currentSubject, selectedChapterId],
  );

  // Reset chapter selection if subject changes
  useEffect(() => { setSelectedChapterId(''); }, [selectedSubjectId]);

  const canUpload = !!currentChapter && !uploading;

  // ── library mutations ─────────────────────────────────────────────────
  // Subjects/chapters are managed exclusively from the Planner page; this page only
  // imports them and uploads documents into them.
  async function handleSyncPlanner() {
    if (!state.subjects?.length) {
      addNotification('error', 'No Planner subjects to import. Add subjects in the Planner first.');
      return;
    }
    try {
      const synced = await syncFromPlanner(state.subjects);
      dispatch({ type: 'SET_LIBRARY', payload: synced.subjects || [] });
      addNotification('success', `Imported ${synced.created} subject(s) from Planner.`);
    } catch (err) {
      addNotification('error', err.message);
    }
  }

  // ── upload ────────────────────────────────────────────────────────────
  async function uploadFile(file) {
    if (!file) return;
    if (!currentChapter) {
      addNotification('error', 'Select a Subject and Chapter before uploading.');
      return;
    }

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
    formData.append('chapterId', currentChapter.id);

    try {
      const res = await apiFetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        addNotification('error', data.error || 'Upload failed.');
      } else {
        const subjects = await fetchHierarchy();
        dispatch({ type: 'SET_LIBRARY', payload: subjects });
        addNotification(
          'success',
          `"${data.document.name}" uploaded — ${data.document.wordCount.toLocaleString()} words indexed under ${currentSubject.name} / ${currentChapter.name}.`,
        );
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
        const subjects = await fetchHierarchy();
        dispatch({ type: 'SET_LIBRARY', payload: subjects });
        addNotification('success', `"${name}" removed from knowledge base.`);
      }
    } catch {
      addNotification('error', 'Failed to delete document.');
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (!currentChapter) return;
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, [currentChapter]); // eslint-disable-line

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const totalDocs = useMemo(
    () => library.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.documents.length, 0), 0),
    [library],
  );
  const totalWords = useMemo(
    () => library.reduce(
      (n, s) => n + s.chapters.reduce(
        (m, c) => m + c.documents.reduce((k, d) => k + (d.wordCount || 0), 0), 0,
      ), 0,
    ),
    [library],
  );

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>My Study Notes</h1>
            <p className="subtitle">Organize your notes by Subject → Chapter, then upload documents to build your AI tutor's knowledge base.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleSyncPlanner} title="Import subjects/topics from Planner">
              <HiOutlineRefresh /> Import from Planner
            </button>
            <button className="btn btn-secondary btn-sm" onClick={reloadLibrary} disabled={loadingLib}>
              <HiOutlineRefresh /> Refresh
            </button>
          </div>
        </div>
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

      {/* Server status banners */}
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
                You can upload documents, but AI chat won't work until you add your API key.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Selection panel ── */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, fontSize: '0.95rem' }}>
          <HiOutlineFolder style={{ color: 'var(--accent-primary)' }} /> Choose where to upload
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Subject selector */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              Subject
            </label>
            <select
              className="form-control"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={library.length === 0}
            >
              <option value="">{library.length ? 'Select a subject…' : 'No subjects yet — add them in the Planner'}</option>
              {library.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter selector */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
              Chapter
            </label>
            <select
              className="form-control"
              value={selectedChapterId}
              onChange={e => setSelectedChapterId(e.target.value)}
              disabled={!selectedSubjectId}
            >
              <option value="">
                {!selectedSubjectId
                  ? 'Pick a subject first…'
                  : (currentSubject?.chapters?.length
                      ? 'Select a chapter…'
                      : 'No chapters — add topics to this subject in the Planner')}
              </option>
              {currentSubject?.chapters?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {library.length === 0 && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.25)',
            borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)',
          }}>
            <HiOutlineInformationCircle style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--accent-primary)' }} />
            Subjects and chapters are defined in the Planner. Add a subject and its topics there, then click <strong>Import from Planner</strong> above.
          </div>
        )}

        {library.length > 0 && !canUpload && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-secondary)',
          }}>
            <HiOutlineInformationCircle style={{ verticalAlign: '-2px', marginRight: 6, color: '#f59e0b' }} />
            Select a Subject and Chapter above before uploading documents.
          </div>
        )}
      </div>

      {/* Upload area (disabled until chapter selected) */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''} ${!canUpload ? 'disabled' : ''}`}
        onDrop={canUpload ? handleDrop : (e) => e.preventDefault()}
        onDragOver={canUpload ? handleDragOver : (e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onClick={() => canUpload && fileInputRef.current?.click()}
        aria-disabled={!canUpload}
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
          <div style={{ textAlign: 'center', opacity: canUpload ? 1 : 0.55 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, color: dragActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              <HiOutlineCloudUpload />
            </div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>
              {!canUpload
                ? 'Select a subject and chapter first'
                : (dragActive ? 'Drop to upload' : 'Upload your study notes')}
            </div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {canUpload
                ? `Files will be linked to ${currentSubject.name} / ${currentChapter.name}.`
                : 'Upload becomes available once a chapter is chosen.'}
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
            { step: '1', Icon: HiOutlineFolder, label: 'Pick a chapter', desc: 'Subject → Chapter scoping' },
            { step: '2', Icon: HiOutlineCloudUpload, label: 'Upload your notes', desc: 'PDF, Word, or text files' },
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

      {/* Library hierarchy */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1rem' }}>
            Library
            {totalDocs > 0 && (
              <span style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 20, background: 'var(--gradient-primary)', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                {totalDocs} document{totalDocs === 1 ? '' : 's'}
              </span>
            )}
          </h3>
          {totalWords > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {totalWords.toLocaleString()} words indexed
            </span>
          )}
        </div>

        {library.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <HiOutlineFolder style={{ fontSize: '2.5rem', color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
            <h3>No subjects in your library yet</h3>
            <p>
              Subjects and chapters live in the Planner. Add them there, then click <strong>Import from Planner</strong> at the top of this page.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {library.map(subject => (
              <div key={subject.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', background: 'var(--bg-glass)',
                  borderBottom: '1px solid var(--border-light)',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: subject.color || '#7B61FF' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{subject.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    · {subject.chapters.length} chapter{subject.chapters.length === 1 ? '' : 's'}
                  </span>
                </div>

                {subject.chapters.length === 0 ? (
                  <div style={{ padding: '14px 18px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    No chapters yet. Add topics to this subject in the Planner, then re-import.
                  </div>
                ) : (
                  subject.chapters.map(ch => (
                    <div key={ch.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 16px',
                        fontSize: '0.85rem', color: 'var(--text-secondary)',
                      }}>
                        <HiOutlineFolder style={{ color: 'var(--accent-primary)' }} />
                        <strong>{ch.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          · {ch.documents.length} document{ch.documents.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {ch.documents.length > 0 && (
                        <div style={{ padding: '0 12px 10px' }}>
                          {ch.documents.map(doc => (
                            <div key={doc.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 12px', borderRadius: 8,
                                background: 'var(--bg-glass)', marginTop: 6,
                              }}>
                              <HiOutlineDocumentText style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {doc.name}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  {(doc.wordCount || 0).toLocaleString()} words · {doc.chunkCount} chunks · {formatDate(doc.uploadedAt)}
                                </div>
                              </div>
                              <span style={{
                                padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                                background: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)',
                                border: '1px solid rgba(16,185,129,0.3)',
                              }}>Indexed</span>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ flexShrink: 0, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => deleteDocument(doc.id, doc.name)}
                                title="Remove from knowledge base"
                              >
                                <HiOutlineTrash />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
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
        .upload-zone.uploading { cursor: not-allowed; opacity: 0.8; }
        .upload-zone.disabled {
          cursor: not-allowed;
          opacity: 0.6;
          background: var(--bg-secondary);
        }
        .upload-zone.disabled:hover { border-color: var(--border-color); background: var(--bg-secondary); }
        .upload-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
