import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineChevronDown, HiOutlineChevronRight,
  HiOutlineDocumentText, HiOutlineFolder, HiOutlineRefresh,
} from 'react-icons/hi';
import { useApp } from '../context/AppContext';
import { fetchHierarchy, syncFromPlanner } from '../lib/library';

// Hierarchical Subject -> Chapter -> Documents accordion with checkboxes.
// The selected document IDs are stored globally in `state.activeDocumentIds`,
// so the same selection is shared between the Tutor and Evaluator pages.
export default function DocumentContextPicker({ title = 'Active context', autoSyncFromPlanner = true }) {
  const { state, dispatch } = useApp();
  const library = state.library;
  const activeIds = state.activeDocumentIds;

  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  async function reload() {
    setLoading(true);
    try {
      const subjects = await fetchHierarchy();
      dispatch({ type: 'SET_LIBRARY', payload: subjects });

      if (autoSyncFromPlanner && subjects.length === 0 && (state.subjects?.length || 0) > 0) {
        try {
          const synced = await syncFromPlanner(state.subjects);
          dispatch({ type: 'SET_LIBRARY', payload: synced.subjects || [] });
        } catch (e) {
          console.warn('Planner auto-sync failed:', e.message);
        }
      }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
    }
  }

  const allDocIds = useMemo(() => {
    const ids = [];
    for (const s of library) for (const c of s.chapters) for (const d of c.documents) ids.push(d.id);
    return ids;
  }, [library]);

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDoc(docId) {
    dispatch({ type: 'TOGGLE_ACTIVE_DOCUMENT', payload: docId });
  }

  function setMany(ids) {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT_IDS', payload: ids });
  }

  function chapterDocIds(ch) {
    return ch.documents.map(d => d.id);
  }

  function subjectDocIds(s) {
    return s.chapters.flatMap(chapterDocIds);
  }

  function isAllSelected(ids) {
    return ids.length > 0 && ids.every(id => activeIds.includes(id));
  }

  function toggleSubjectAll(subject) {
    const ids = subjectDocIds(subject);
    if (ids.length === 0) return;
    if (isAllSelected(ids)) {
      setMany(activeIds.filter(id => !ids.includes(id)));
    } else {
      setMany(Array.from(new Set([...activeIds, ...ids])));
    }
  }

  function toggleChapterAll(chapter) {
    const ids = chapterDocIds(chapter);
    if (ids.length === 0) return;
    if (isAllSelected(ids)) {
      setMany(activeIds.filter(id => !ids.includes(id)));
    } else {
      setMany(Array.from(new Set([...activeIds, ...ids])));
    }
  }

  const totalDocs = allDocIds.length;
  const selectedCount = activeIds.length;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-glass)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HiOutlineFolder style={{ color: 'var(--accent-primary)' }} />
          <strong style={{ fontSize: '0.9rem' }}>{title}</strong>
          <span style={{
            fontSize: '0.7rem', padding: '1px 8px', borderRadius: 99,
            background: selectedCount > 0 ? 'rgba(123,97,255,0.18)' : 'var(--bg-secondary)',
            color: selectedCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: 700,
          }}>
            {selectedCount}/{totalDocs} document{totalDocs === 1 ? '' : 's'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {selectedCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setMany([])} style={{ fontSize: '0.72rem' }}>
              Clear
            </button>
          )}
          {totalDocs > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMany(selectedCount === totalDocs ? [] : allDocIds)}
              style={{ fontSize: '0.72rem' }}
            >
              {selectedCount === totalDocs ? 'Deselect all' : 'Select all'}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={reload}
            disabled={loading}
            style={{ fontSize: '0.72rem' }}
            title="Reload"
          >
            <HiOutlineRefresh />
          </button>
        </div>
      </div>

      {totalDocs === 0 ? (
        <div style={{ padding: '14px 18px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
          No documents in your library yet. Upload notes from the <strong>Documents</strong> page to use them here.
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {library.map(subject => {
            const subjIds = subjectDocIds(subject);
            const subjAllSelected = isAllSelected(subjIds);
            const subjSomeSelected = subjIds.some(id => activeIds.includes(id));
            const subjExpanded = expanded.has(`s:${subject.id}`);
            return (
              <div key={subject.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                }}>
                  <button
                    onClick={() => toggleExpand(`s:${subject.id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {subjExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                  </button>
                  <input
                    type="checkbox"
                    checked={subjAllSelected}
                    ref={el => { if (el) el.indeterminate = !subjAllSelected && subjSomeSelected; }}
                    onChange={() => toggleSubjectAll(subject)}
                    disabled={subjIds.length === 0}
                  />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: subject.color || '#7B61FF' }} />
                  <strong style={{ fontSize: '0.88rem' }}>{subject.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {subjIds.length} document{subjIds.length === 1 ? '' : 's'}
                  </span>
                </div>

                {subjExpanded && subject.chapters.map(ch => {
                  const chIds = chapterDocIds(ch);
                  const chAllSelected = isAllSelected(chIds);
                  const chSomeSelected = chIds.some(id => activeIds.includes(id));
                  const chExpanded = expanded.has(`c:${ch.id}`);
                  return (
                    <div key={ch.id} style={{ paddingLeft: 18, borderTop: '1px solid var(--border-light)' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px',
                      }}>
                        <button
                          onClick={() => toggleExpand(`c:${ch.id}`)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                        >
                          {chExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
                        </button>
                        <input
                          type="checkbox"
                          checked={chAllSelected}
                          ref={el => { if (el) el.indeterminate = !chAllSelected && chSomeSelected; }}
                          onChange={() => toggleChapterAll(ch)}
                          disabled={chIds.length === 0}
                        />
                        <HiOutlineFolder style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>{ch.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {chIds.length} document{chIds.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {chExpanded && ch.documents.map(doc => {
                        const checked = activeIds.includes(doc.id);
                        return (
                          <label
                            key={doc.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '6px 14px 6px 60px',
                              fontSize: '0.83rem', color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              background: checked ? 'rgba(123,97,255,0.05)' : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDoc(doc.id)}
                            />
                            <HiOutlineDocumentText style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.name}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {(doc.wordCount || 0).toLocaleString()} words
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
