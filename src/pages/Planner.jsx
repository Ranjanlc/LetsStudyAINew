import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { plannerAgent } from '../agents/plannerAgent';
import { formatLocalDateKey } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus, HiOutlineTrash, HiOutlineCalendar,
  HiOutlineLightningBolt, HiOutlineCheckCircle, HiOutlineClock,
  HiOutlineX, HiOutlineSparkles, HiOutlineRefresh, HiOutlineFire,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineViewGrid,
  HiOutlineViewList, HiOutlineChip, HiOutlineBookOpen,
} from 'react-icons/hi';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_COLORS = [
  '#7B61FF', '#E040FB', '#00E5FF', '#00E676',
  '#FFD740', '#FF4B6E', '#40C4FF', '#FFAB40',
  '#69F0AE', '#EA80FC',
];

const SAMPLE_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'English', 'History', 'Science',
];

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'var(--accent-danger)',   bg: 'rgba(255,75,110,0.12)',  dot: '#FF4B6E' },
  medium: { label: 'Medium', color: 'var(--accent-warning)',  bg: 'rgba(255,215,64,0.12)',  dot: '#FFD740' },
  low:    { label: 'Low',    color: 'var(--accent-info)',     bg: 'rgba(64,196,255,0.12)',  dot: '#40C4FF' },
};

const DIFFICULTY_CONFIG = {
  hard:   { label: '🔥 Hard',   color: '#FF6B6B' },
  medium: { label: '⚡ Medium', color: '#FFD740' },
  easy:   { label: '✅ Easy',   color: '#00E676' },
};

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatLocalDateKey(d);
}

const DEMO_SUBJECTS = [
  {
    id: 'demo-ai',
    name: 'Artificial Intelligence',
    topics: ['Search Algorithms', 'Machine Learning', 'AI Agents'],
    deadline: daysFromNow(5),
    priority: 'high',
    difficulty: 'hard',
    estimatedHours: 8,
    color: SUBJECT_COLORS[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-db',
    name: 'Database Systems',
    topics: ['SQL Basics', 'Normalization'],
    deadline: daysFromNow(8),
    priority: 'medium',
    difficulty: 'medium',
    estimatedHours: 6,
    color: SUBJECT_COLORS[1],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-os',
    name: 'Operating Systems',
    topics: ['Processes', 'CPU Scheduling'],
    deadline: daysFromNow(3),
    priority: 'high',
    difficulty: 'hard',
    estimatedHours: 5,
    color: SUBJECT_COLORS[3],
    createdAt: new Date().toISOString(),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Planner() {
  const { state, dispatch } = useApp();
  const [showAddForm, setShowAddForm]       = useState(false);
  const [activeTab, setActiveTab]           = useState('subjects');
  const [scheduleView, setScheduleView]     = useState('list');
  const [aiLoading, setAiLoading]           = useState(false);
  const [demoLoading, setDemoLoading]       = useState(false);
  const [aiGenerated, setAiGenerated]       = useState(false);
  const [aiInsights, setAiInsights]         = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [weekOffset, setWeekOffset]         = useState(0);
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [newSubject, setNewSubject]         = useState({
    name: '', customName: '', topics: '', deadline: '',
    priority: 'medium', difficulty: 'medium', estimatedHours: '',
  });

  const today     = formatLocalDateKey();
  const progress  = plannerAgent.getProgress(state.studyPlan);
  const totalHours = plannerAgent.getTotalHours(state.studyPlan);
  const streak    = plannerAgent.getStudyStreak(state.studyPlan);
  const todayTasks = plannerAgent.getDailyPlan(state.studyPlan, today);
  const pendingToday = todayTasks.filter(t => !t.completed);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(
    () => plannerAgent.getWeekPlan(state.studyPlan, weekStart),
    [state.studyPlan, weekStart]
  );

  const groupedTasks = useMemo(() => {
    const groups = {};
    state.studyPlan.forEach(task => {
      if (!groups[task.date]) groups[task.date] = [];
      groups[task.date].push(task);
    });
    return groups;
  }, [state.studyPlan]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(weekStart)} – ${fmt(end)}`;
  }, [weekStart]);

  const tips = state.subjects.length > 0
    ? plannerAgent.getStudyTips(state.subjects[0].name)
    : plannerAgent.getStudyTips('General');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddSubject = (e) => {
    e.preventDefault();
    const subjectName = newSubject.name === 'custom' ? newSubject.customName : newSubject.name;
    const topicsList  = newSubject.topics.split(',').map(t => t.trim()).filter(Boolean);
    if (!subjectName || topicsList.length === 0 || !newSubject.deadline) return;

    dispatch({
      type: 'ADD_SUBJECT',
      payload: {
        id: `sub-${Date.now()}`,
        name: subjectName,
        topics: topicsList,
        deadline: newSubject.deadline,
        priority: newSubject.priority,
        difficulty: newSubject.difficulty,
        estimatedHours: newSubject.estimatedHours ? Number(newSubject.estimatedHours) : null,
        color: SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length],
        createdAt: new Date().toISOString(),
      },
    });
    setNewSubject({ name: '', customName: '', topics: '', deadline: '', priority: 'medium', difficulty: 'medium', estimatedHours: '' });
    setShowAddForm(false);
  };

  const generatePlanFromSubjects = async (subjects) => {
    if (!subjects?.length) return;
    setAiLoading(true);
    setAiInsights(null);

    const aiTasks = await plannerAgent.generateAISchedule(subjects);
    const tasks   = aiTasks || plannerAgent.generateSchedule(subjects);
    const wasAI   = !!aiTasks;

    dispatch({ type: 'SET_STUDY_PLAN', payload: tasks });
    setAiGenerated(wasAI);
    setAiLoading(false);
    setAiInsights(plannerAgent.getLocalInsights(subjects, tasks));

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: Date.now(), text: wasAI ? 'AI study plan generated!' : 'Study plan generated!', time: new Date().toISOString() },
    });

    setInsightsLoading(true);
    const ai = await plannerAgent.getInsights(subjects, tasks);
    if (ai) setAiInsights(ai);
    setInsightsLoading(false);
  };

  const generatePlan = () => generatePlanFromSubjects(state.subjects);

  const loadDemoData = async () => {
    setDemoLoading(true);
    setDismissedAlert(false);
    // Replace only planner data; keep user profile and other account data intact.
    dispatch({ type: 'SET_STUDY_PLAN', payload: [] });
    state.subjects.forEach(s => dispatch({ type: 'REMOVE_SUBJECT', payload: s.id }));
    DEMO_SUBJECTS.forEach(s => dispatch({ type: 'ADD_SUBJECT', payload: s }));
    await generatePlanFromSubjects(DEMO_SUBJECTS);
    setActiveTab('schedule');
    setDemoLoading(false);
  };

  const clearPlan = () => {
    dispatch({ type: 'SET_STUDY_PLAN', payload: [] });
    setAiInsights(null);
    setAiGenerated(false);
    setDismissedAlert(false);
  };

  const isLoading = aiLoading || demoLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              boxShadow: '0 4px 16px rgba(123,97,255,0.3)',
            }}>🗓️</div>
            <div>
              <h1 style={{ marginBottom: 2, fontSize: '1.6rem' }}>Planner Agent</h1>
              <p className="subtitle" style={{ marginBottom: 0 }}>
                AI-powered study schedules tailored to your deadlines
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={loadDemoData} disabled={isLoading}
              style={{ borderStyle: 'dashed', fontSize: '0.82rem' }}>
              {demoLoading
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> Loading...</>
                : '🎯 Load Demo'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)} disabled={isLoading}>
              <HiOutlinePlus /> Add Subject
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {[
          { icon: <HiOutlineBookOpen />, value: state.subjects.length, label: 'Subjects', color: 'var(--accent-primary)', bg: 'rgba(123,97,255,0.15)' },
          { icon: <HiOutlineClock />,    value: `${totalHours}h`,      label: 'Study Hours', color: 'var(--accent-tertiary)', bg: 'rgba(0,229,255,0.12)' },
          { icon: <HiOutlineCheckCircle />, value: `${progress.percentage}%`, label: 'Completed', color: 'var(--accent-success)', bg: 'rgba(0,230,118,0.12)' },
          { icon: <HiOutlineFire />,     value: streak,                label: 'Day Streak', color: 'var(--accent-warning)', bg: 'rgba(255,215,64,0.12)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-info">
              <h3 style={{ color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {state.studyPlan.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="card" style={{ marginBottom: '14px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Overall Progress</span>
              {aiGenerated && (
                <span style={{
                  fontSize: '0.68rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(123,97,255,0.15)', color: 'var(--accent-primary)', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <HiOutlineChip style={{ fontSize: '0.8rem' }} /> AI Generated
                </span>
              )}
            </div>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '1rem' }}>{progress.percentage}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: 'var(--gradient-primary)', borderRadius: 99 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <span>{progress.completed} tasks completed</span>
            <span>{progress.total - progress.completed} remaining</span>
          </div>
        </motion.div>
      )}

      {/* ── Incomplete Tasks Alert ── */}
      <AnimatePresence>
        {pendingToday.length > 0 && !dismissedAlert && (
          <motion.div key="alert"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '11px 16px', marginBottom: '12px',
              background: 'rgba(255,75,110,0.09)',
              border: '1px solid rgba(255,75,110,0.28)',
              borderRadius: 'var(--radius-md)',
            }}>
            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
            <span style={{ flex: 1, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--accent-danger)' }}>
                {pendingToday.length} task{pendingToday.length > 1 ? 's' : ''} pending today.
              </strong>{' '}
              Complete them to keep your streak alive.
            </span>
            <button onClick={() => setDismissedAlert(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2px 4px' }}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Today's Focus ── */}
      <AnimatePresence>
        {todayTasks.length > 0 && (
          <motion.div key="today"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(123,97,255,0.1) 0%, rgba(224,64,251,0.06) 100%)',
              border: '1px solid rgba(123,97,255,0.25)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(123,97,255,0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineLightningBolt style={{ color: 'var(--accent-warning)', fontSize: '1.1rem' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Today's Focus</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(123,97,255,0.15)', color: 'var(--accent-primary)', fontWeight: 600,
                  }}>
                    {todayTasks.reduce((s, t) => s + (t.duration || 0), 0)}h scheduled
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {todayTasks.filter(t => t.completed).length}/{todayTasks.length} done
                </span>
              </div>
              {/* Tasks */}
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayTasks.map(task => (
                  <TodayTaskRow key={task.id} task={task} dispatch={dispatch} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Coach Banner ── */}
      <AnimatePresence>
        {aiInsights && (
          <motion.div key="insights"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginBottom: '14px',
              background: 'linear-gradient(135deg, rgba(0,229,255,0.07) 0%, rgba(123,97,255,0.07) 100%)',
              border: '1px solid rgba(0,229,255,0.18)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <HiOutlineChip style={{ color: 'var(--accent-tertiary)', fontSize: '1rem' }} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                {aiInsights.isLocal ? 'Study Coach' : 'AI Coach'}
              </span>
              {insightsLoading && (
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  upgrading with AI...
                </span>
              )}
              {aiInsights.urgentSubject && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 10px',
                  background: 'rgba(255,75,110,0.15)', color: 'var(--accent-danger)',
                  borderRadius: 'var(--radius-full)', fontWeight: 700,
                }}>
                  Urgent: {aiInsights.urgentSubject}
                </span>
              )}
            </div>
            {aiInsights.summary && (
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.55 }}>
                {aiInsights.summary}
              </p>
            )}
            {aiInsights.recommendation && (
              <div style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '10px 14px',
                background: 'rgba(123,97,255,0.1)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--accent-primary)',
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', flexShrink: 0, paddingTop: 2 }}>
                  TODAY
                </span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {aiInsights.recommendation}
                </span>
              </div>
            )}
            {aiInsights.encouragement && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-success)', margin: '8px 0 0', fontStyle: 'italic' }}>
                ✨ {aiInsights.encouragement}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Row ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-success" onClick={generatePlan}
          disabled={state.subjects.length === 0 || isLoading} style={{ minWidth: 176 }}>
          {aiLoading
            ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> Generating...</>
            : <><HiOutlineSparkles /> Generate AI Plan</>}
        </button>
        {state.studyPlan.length > 0 && (
          <button className="btn btn-secondary" onClick={clearPlan} style={{ marginLeft: 'auto' }}>
            <HiOutlineRefresh /> Clear Plan
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {[
          { key: 'subjects', label: 'Subjects', count: state.subjects.length },
          { key: 'schedule', label: 'Schedule', count: state.studyPlan.length },
          { key: 'tips',     label: 'Study Tips', count: 0 },
        ].map(tab => (
          <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 'var(--radius-full)',
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--accent-primary)',
                color: 'white', fontSize: '0.65rem', fontWeight: 700, marginLeft: 6,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">

        {/* SUBJECTS TAB */}
        {activeTab === 'subjects' && (
          <motion.div key="subjects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state.subjects.length === 0 ? (
              <EmptyState onLoadDemo={loadDemoData} onAdd={() => setShowAddForm(true)} demoLoading={demoLoading} />
            ) : (
              <div className="grid-auto">
                {state.subjects.map(sub => (
                  <SubjectCard
                    key={sub.id}
                    subject={sub}
                    dispatch={dispatch}
                    progress={plannerAgent.getSubjectProgress(state.studyPlan, sub.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🗓️</div>
                <h3>No schedule yet</h3>
                <p>Add subjects and click "Generate AI Plan" to create your schedule.</p>
                <button className="btn btn-success" onClick={generatePlan} disabled={state.subjects.length === 0 || isLoading}>
                  <HiOutlineSparkles /> Generate AI Plan
                </button>
              </div>
            ) : (
              <>
                {/* View toggle + week nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className={`btn btn-sm ${scheduleView === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setScheduleView('list')} style={{ fontSize: '0.8rem' }}>
                      <HiOutlineViewList /> List
                    </button>
                    <button className={`btn btn-sm ${scheduleView === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setScheduleView('week')} style={{ fontSize: '0.8rem' }}>
                      <HiOutlineViewGrid /> Week
                    </button>
                  </div>
                  {scheduleView === 'week' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setWeekOffset(w => w - 1)}><HiOutlineChevronLeft /></button>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: 130, textAlign: 'center' }}>
                        {weekLabel}
                      </span>
                      <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setWeekOffset(w => w + 1)}><HiOutlineChevronRight /></button>
                      {weekOffset !== 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)} style={{ fontSize: '0.75rem' }}>Today</button>
                      )}
                    </div>
                  )}
                </div>

                {scheduleView === 'list'
                  ? <ScheduleList groupedTasks={groupedTasks} today={today} dispatch={dispatch} />
                  : <WeekCalendar weekDays={weekDays} today={today} dispatch={dispatch} />
                }
              </>
            )}
          </motion.div>
        )}

        {/* TIPS TAB */}
        {activeTab === 'tips' && (
          <motion.div key="tips" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: '16px' }}>
                <HiOutlineLightningBolt className="icon" /> Study Tips
                {state.subjects.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    for {state.subjects[0].name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px 16px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span style={{
                      minWidth: 24, height: 24, borderRadius: '50%',
                      background: 'var(--gradient-primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Subject Modal ── */}
      <AnimatePresence>
        {showAddForm && (
          <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
            <motion.div className="modal" onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 24 }}>
              <div className="modal-header">
                <h2>Add Subject</h2>
                <button className="btn btn-icon btn-secondary" onClick={() => setShowAddForm(false)}><HiOutlineX /></button>
              </div>
              <form onSubmit={handleAddSubject}>
                <div className="form-group">
                  <label>Subject Name</label>
                  <select className="form-control" value={newSubject.name}
                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value, customName: '' })} required>
                    <option value="">Select a subject...</option>
                    {SAMPLE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom">Other (type below)</option>
                  </select>
                  {newSubject.name === 'custom' && (
                    <input type="text" className="form-control" style={{ marginTop: 8 }}
                      placeholder="Enter subject name" value={newSubject.customName} autoFocus
                      onChange={e => setNewSubject({ ...newSubject, customName: e.target.value })} required />
                  )}
                </div>
                <div className="form-group">
                  <label>Topics <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g., Algebra, Calculus, Trigonometry"
                    value={newSubject.topics}
                    onChange={e => setNewSubject({ ...newSubject, topics: e.target.value })} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Deadline</label>
                    <input type="date" className="form-control" value={newSubject.deadline} min={today} required
                      onChange={e => setNewSubject({ ...newSubject, deadline: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Est. Total Hours <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <input type="number" className="form-control" placeholder="e.g. 20" min="1" max="200"
                      value={newSubject.estimatedHours}
                      onChange={e => setNewSubject({ ...newSubject, estimatedHours: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="form-control" value={newSubject.priority}
                      onChange={e => setNewSubject({ ...newSubject, priority: e.target.value })}>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select className="form-control" value={newSubject.difficulty}
                      onChange={e => setNewSubject({ ...newSubject, difficulty: e.target.value })}>
                      <option value="hard">🔥 Hard</option>
                      <option value="medium">⚡ Medium</option>
                      <option value="easy">✅ Easy</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Subject</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onLoadDemo, onAdd, demoLoading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        padding: '36px 28px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(123,97,255,0.1) 0%, rgba(224,64,251,0.07) 100%)',
        border: '1px solid rgba(123,97,255,0.25)', borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: '2.8rem', marginBottom: '14px' }}>🗓️</div>
        <h3 style={{ marginBottom: '8px', fontSize: '1.15rem' }}>No subjects yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px', maxWidth: 360, margin: '0 auto 24px' }}>
          Load demo data to instantly see a full AI-generated schedule — or add your own subjects.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onLoadDemo} disabled={demoLoading} style={{ minWidth: 160 }}>
            {demoLoading
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span> Loading...</>
              : '🎯 Load Demo Data'}
          </button>
          <button className="btn btn-secondary" onClick={onAdd}><HiOutlinePlus /> Add Subject</button>
        </div>
      </div>
      <div style={{
        padding: '16px 20px', background: 'var(--bg-card)',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
      }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Demo includes
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DEMO_SUBJECTS.map(s => {
            const daysLeft = Math.ceil((new Date(s.deadline) - new Date()) / 86400000);
            const pc = PRIORITY_CONFIG[s.priority];
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, flex: 1 }}>{s.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{s.topics.length} topics</span>
                <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 'var(--radius-full)', background: pc.bg, color: pc.color, fontWeight: 600 }}>
                  {pc.label}
                </span>
                <span style={{ fontSize: '0.72rem', color: daysLeft <= 3 ? 'var(--accent-danger)' : 'var(--accent-warning)', fontWeight: 600 }}>
                  {daysLeft}d left
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TodayTaskRow({ task, dispatch }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '11px 14px',
      background: task.completed ? 'rgba(0,230,118,0.06)' : 'var(--bg-glass)',
      border: `1px solid ${task.completed ? 'rgba(0,230,118,0.18)' : 'var(--border-light)'}`,
      borderRadius: 'var(--radius-md)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ width: 4, minHeight: 36, borderRadius: 4, background: task.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.88rem', fontWeight: 600,
          textDecoration: task.completed ? 'line-through' : 'none',
          opacity: task.completed ? 0.45 : 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {task.topic}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{task.subjectName}</span>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>• {task.duration}h</span>
          {task.type === 'revision' && (
            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(255,215,64,0.15)', color: 'var(--accent-warning)', fontWeight: 600 }}>
              Revision
            </span>
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <CheckButton completed={task.completed} onToggle={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })} />
    </div>
  );
}

function SubjectCard({ subject, dispatch, progress }) {
  const daysLeft = Math.ceil((new Date(subject.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const pc = PRIORITY_CONFIG[subject.priority] || PRIORITY_CONFIG.medium;
  const dc = DIFFICULTY_CONFIG[subject.difficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      transition: 'all 0.2s ease', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: subject.color }} />
      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subject.name}
            </span>
          </div>
          <button className="btn btn-icon btn-secondary btn-sm"
            style={{ width: 28, height: 28, fontSize: '0.78rem', flexShrink: 0, marginLeft: 8 }}
            onClick={() => dispatch({ type: 'REMOVE_SUBJECT', payload: subject.id })}>
            <HiOutlineTrash />
          </button>
        </div>

        {/* Topics */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
          {subject.topics.map(t => (
            <span key={t} className="chip" style={{ fontSize: '0.7rem' }}>{t}</span>
          ))}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HiOutlineCalendar style={{ flexShrink: 0 }} />
            {new Date(subject.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: pc.bg, color: pc.color, fontWeight: 600 }}>
            {pc.label}
          </span>
          <span style={{ fontSize: '0.7rem', color: dc.color, fontWeight: 500 }}>{dc.label}</span>
          {subject.estimatedHours && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>~{subject.estimatedHours}h</span>
          )}
          <span style={{
            marginLeft: 'auto', fontSize: '0.73rem', fontWeight: 600,
            color: daysLeft <= 0 ? 'var(--accent-danger)' : daysLeft <= 3 ? 'var(--accent-danger)' : 'var(--text-muted)',
          }}>
            {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
          </span>
        </div>

        {/* Progress bar (only when tasks exist) */}
        {progress.total > 0 && (
          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Progress</span>
              <span style={{ color: subject.color, fontWeight: 700 }}>{progress.percentage}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progress.percentage}%`, height: '100%', background: subject.color, borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {progress.completed}/{progress.total} tasks done
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleList({ groupedTasks, today, dispatch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Object.entries(groupedTasks).map(([date, tasks]) => {
        const dateObj  = new Date(date + 'T00:00:00');
        const isToday  = date === today;
        const isPast   = date < today;
        const dayLabel = isToday
          ? 'Today'
          : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const completed  = tasks.filter(t => t.completed).length;
        const totalHours = tasks.reduce((s, t) => s + (t.duration || 0), 0);

        return (
          <div key={date} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${isToday ? 'rgba(123,97,255,0.35)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            opacity: isPast && !isToday ? 0.7 : 1,
          }}>
            {/* Day header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 18px',
              background: isToday ? 'rgba(123,97,255,0.07)' : 'var(--bg-glass)',
              borderBottom: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isToday && <span style={{ fontSize: '0.85rem' }}>📍</span>}
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                  {dayLabel}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{totalHours}h</span>
              </div>
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                background: completed === tasks.length ? 'rgba(0,230,118,0.15)' : 'rgba(123,97,255,0.12)',
                color: completed === tasks.length ? 'var(--accent-success)' : 'var(--accent-primary)',
                fontWeight: 600,
              }}>
                {completed}/{tasks.length} done
              </span>
            </div>
            {/* Tasks */}
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tasks.map(task => (
                <ScheduleTaskRow key={task.id} task={task} dispatch={dispatch} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTaskRow({ task, dispatch }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      background: task.completed ? 'rgba(0,230,118,0.04)' : 'transparent',
      transition: 'background 0.15s ease',
    }}
      onMouseEnter={e => !task.completed && (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => e.currentTarget.style.background = task.completed ? 'rgba(0,230,118,0.04)' : 'transparent'}
    >
      <div style={{ width: 4, height: 34, borderRadius: 4, background: task.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.87rem', fontWeight: 600,
          opacity: task.completed ? 0.4 : 1,
          textDecoration: task.completed ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {task.topic}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.subjectName}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• {task.duration}h</span>
          {task.type === 'revision' && (
            <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(255,215,64,0.15)', color: 'var(--accent-warning)', fontWeight: 600 }}>
              Revision
            </span>
          )}
          <PriorityBadge priority={task.priority} />
          {task.difficulty && task.difficulty !== 'medium' && (
            <span style={{ fontSize: '0.66rem', color: DIFFICULTY_CONFIG[task.difficulty]?.color || 'var(--text-muted)' }}>
              {DIFFICULTY_CONFIG[task.difficulty]?.label}
            </span>
          )}
        </div>
      </div>
      <CheckButton completed={task.completed} onToggle={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })} />
    </div>
  );
}

function WeekCalendar({ weekDays, today, dispatch }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
      {weekDays.map(day => {
        const isToday = day.date === today;
        const isPast  = day.date < today;
        const visible = day.tasks.slice(0, 3);
        const extra   = day.tasks.length - visible.length;
        const dayHours = day.tasks.reduce((s, t) => s + (t.duration || 0), 0);

        return (
          <div key={day.date} style={{
            background: 'var(--bg-card)',
            border: `1px solid ${isToday ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            minHeight: 130,
            boxShadow: isToday ? '0 0 0 1px rgba(123,97,255,0.15)' : 'none',
          }}>
            <div style={{
              padding: '8px 8px 5px',
              borderBottom: '1px solid var(--border-light)',
              background: isToday ? 'rgba(123,97,255,0.08)' : 'var(--bg-glass)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {day.label}
              </div>
              <div style={{
                fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.3,
                color: isToday ? 'var(--accent-primary)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                opacity: isPast && !isToday ? 0.5 : 1,
              }}>
                {day.dayNum}
              </div>
              {dayHours > 0 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{dayHours}h</div>}
            </div>
            <div style={{ padding: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {visible.length === 0
                ? <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.4 }}>—</div>
                : <>
                    {visible.map(task => (
                      <button key={task.id}
                        onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
                        title={`${task.topic} — ${task.subjectName} (${task.duration}h)`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '3px 6px', borderRadius: 4,
                          background: task.color + '22', color: task.color,
                          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                          fontSize: '0.66rem', fontWeight: 600,
                          opacity: task.completed ? 0.4 : 1,
                          textDecoration: task.completed ? 'line-through' : 'none',
                          transition: 'opacity 0.15s ease',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
                        {task.topic}
                      </button>
                    ))}
                    {extra > 0 && <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', textAlign: 'center' }}>+{extra} more</div>}
                  </>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const pc = PRIORITY_CONFIG[priority];
  if (!pc) return null;
  return (
    <span style={{
      fontSize: '0.66rem', padding: '1px 6px', borderRadius: 99,
      background: pc.bg, color: pc.color, fontWeight: 600,
    }}>
      {pc.label}
    </span>
  );
}

function CheckButton({ completed, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${completed ? 'var(--accent-success)' : 'var(--border-color)'}`,
      background: completed ? 'var(--accent-success)' : 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: completed ? 'white' : 'transparent', fontSize: '10px',
      transition: 'all 0.18s ease',
    }}>
      {completed ? '✓' : ''}
    </button>
  );
}
