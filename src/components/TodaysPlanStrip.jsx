import { useMemo } from 'react';
import { HiOutlineCalendar, HiOutlineLink, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useApp } from '../context/AppContext';
import { plannerAgent } from '../agents/plannerAgent';
import { formatLocalDateKey } from '../utils/dateUtils';

/**
 * Today's Plan strip — surfaces the Planner ↔ Tutor / Evaluator connection
 * so the student can see *why* a particular set of documents is being
 * recommended and choose whether to follow the plan or pick something else.
 *
 * Props:
 *  - actionLabel: button label, e.g. "Study this" / "Quiz this"
 *  - onPick(task, documentIds): called after we update activeDocumentIds; the
 *    Evaluator uses this hook to also set focusTopic / switch to doc-quiz
 *    mode. Optional — Tutor passes nothing and just rides the global
 *    activeDocumentIds update.
 */
export default function TodaysPlanStrip({ actionLabel = 'Study this', onPick }) {
  const { state, dispatch } = useApp();
  const today = formatLocalDateKey();

  const todayTasks = useMemo(
    () => plannerAgent.getDailyPlan(state.studyPlan || [], today).filter(t => !t.completed),
    [state.studyPlan, today],
  );

  // For each task, find documents in the library whose subject+chapter match
  // the task's subject+topic (case-insensitive). The chapter name is the
  // primary signal — chapters are created from Planner topics on import.
  const taskDocLookup = useMemo(() => {
    const out = new Map();
    const norm = s => String(s || '').trim().toLowerCase();
    for (const task of todayTasks) {
      const subjKey = norm(task.subjectName);
      const topicKey = norm(task.topic);
      let matchedIds = [];
      for (const subj of state.library || []) {
        if (norm(subj.name) !== subjKey) continue;
        for (const ch of subj.chapters || []) {
          const chKey = norm(ch.name);
          if (chKey === topicKey || chKey.includes(topicKey) || topicKey.includes(chKey)) {
            for (const d of ch.documents || []) matchedIds.push(d.id);
          }
        }
      }
      out.set(task.id, matchedIds);
    }
    return out;
  }, [todayTasks, state.library]);

  const activeIdSet = useMemo(() => new Set(state.activeDocumentIds || []), [state.activeDocumentIds]);

  if (todayTasks.length === 0) {
    return null;
  }

  function handlePick(task) {
    const ids = taskDocLookup.get(task.id) || [];
    if (ids.length > 0) {
      dispatch({ type: 'SET_ACTIVE_DOCUMENT_IDS', payload: ids });
    }
    if (typeof onPick === 'function') onPick(task, ids);
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: '12px 16px',
        border: '1px solid rgba(122,108,255,0.3)',
        background: 'rgba(122,108,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <HiOutlineCalendar style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }} />
        <strong style={{ fontSize: '0.92rem' }}>Today&apos;s Plan</strong>
        <span
          title="The Planner is feeding today's topics into the Tutor and Evaluator."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'rgba(0,230,118,0.15)',
            color: 'var(--accent-success)',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          <HiOutlineLink /> Planner connected
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {todayTasks.length} task{todayTasks.length === 1 ? '' : 's'} pending
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {todayTasks.map(task => {
          const docIds = taskDocLookup.get(task.id) || [];
          const hasDocs = docIds.length > 0;
          const allActive = hasDocs && docIds.every(id => activeIdSet.has(id));
          return (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${allActive ? 'var(--accent-success)' : 'var(--border-light)'}`,
                background: allActive ? 'rgba(0,230,118,0.08)' : 'var(--bg-glass)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{task.topic}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {task.subjectName} · {task.duration}h{task.priority ? ` · ${task.priority}` : ''}
                </span>
              </div>
              <button
                className={`btn btn-sm ${allActive ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handlePick(task)}
                disabled={!hasDocs}
                title={hasDocs
                  ? `Load ${docIds.length} document${docIds.length === 1 ? '' : 's'} for "${task.topic}"`
                  : 'No documents linked yet — upload one in Documents.'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {allActive ? 'Loaded ✓' : actionLabel}
              </button>
              {!hasDocs && (
                <HiOutlineExclamationCircle
                  style={{ color: 'var(--accent-warning)', fontSize: '0.95rem' }}
                  title="No documents linked to this topic"
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Or pick any other document in the context picker below to study off-plan.
      </div>
    </div>
  );
}
