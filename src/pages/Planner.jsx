import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { plannerAgent } from '../agents/plannerAgent';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCalendar, HiOutlineLightningBolt, HiOutlineCheckCircle, HiOutlineClock, HiOutlineX, HiOutlineSparkles } from 'react-icons/hi';

const SUBJECT_COLORS = [
  '#7B61FF', '#E040FB', '#00E5FF', '#00E676',
  '#FFD740', '#FF4B6E', '#40C4FF', '#FFAB40',
  '#69F0AE', '#EA80FC',
];

const SAMPLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Science'];

export default function Planner() {
  const { state, dispatch } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('subjects');
  const [newSubject, setNewSubject] = useState({
    name: '',
    topics: '',
    deadline: '',
    priority: 'medium',
  });

  const progress = plannerAgent.getProgress(state.studyPlan);
  const tips = state.subjects.length > 0
    ? plannerAgent.getStudyTips(state.subjects[0].name)
    : plannerAgent.getStudyTips('General');

  const handleAddSubject = (e) => {
    e.preventDefault();
    const topicsList = newSubject.topics.split(',').map(t => t.trim()).filter(Boolean);
    if (!newSubject.name || topicsList.length === 0 || !newSubject.deadline) return;

    const subject = {
      id: `sub-${Date.now()}`,
      name: newSubject.name,
      topics: topicsList,
      deadline: newSubject.deadline,
      priority: newSubject.priority,
      color: SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length],
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_SUBJECT', payload: subject });
    setNewSubject({ name: '', topics: '', deadline: '', priority: 'medium' });
    setShowAddForm(false);
  };

  const generatePlan = () => {
    if (state.subjects.length === 0) return;
    const plan = plannerAgent.generateSchedule(state.subjects);
    dispatch({ type: 'SET_STUDY_PLAN', payload: plan });
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: Date.now(), text: 'Study plan generated successfully!', time: new Date().toISOString() }
    });
  };

  const groupedTasks = useMemo(() => {
    const groups = {};
    state.studyPlan.forEach(task => {
      if (!groups[task.date]) groups[task.date] = [];
      groups[task.date].push(task);
    });
    return groups;
  }, [state.studyPlan]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>Planner Agent</h1>
        <p className="subtitle">Create study schedules, manage subjects, and track your progress</p>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(123,97,255,0.15)', color: 'var(--accent-primary)' }}>
            <HiOutlineCalendar />
          </div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--accent-primary)' }}>{state.subjects.length}</h3>
            <p>Subjects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(224,64,251,0.12)', color: 'var(--accent-secondary)' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-info">
            <h3>{state.studyPlan.length}</h3>
            <p>Tasks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--accent-success)' }}>
            <HiOutlineCheckCircle />
          </div>
          <div className="stat-info">
            <h3 style={{ color: 'var(--accent-success)' }}>{progress.percentage}%</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,215,64,0.12)', color: 'var(--accent-warning)' }}>
            <HiOutlineLightningBolt />
          </div>
          <div className="stat-info">
            <h3>{progress.completed}</h3>
            <p>Done</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {state.studyPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Study Progress</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{progress.percentage}%</span>
          </div>
          <div className="progress-bar" style={{ height: '12px' }}>
            <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>{progress.completed} completed</span>
            <span>{progress.total - progress.completed} remaining</span>
          </div>
        </motion.div>
      )}

      {/* Action Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <HiOutlinePlus /> Add Subject
        </button>
        <button
          className="btn btn-success"
          onClick={generatePlan}
          disabled={state.subjects.length === 0}
        >
          <HiOutlineSparkles /> Generate Study Plan
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>
          Subjects
        </button>
        <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
          Schedule
        </button>
        <button className={`tab ${activeTab === 'tips' ? 'active' : ''}`} onClick={() => setActiveTab('tips')}>
          Study Tips
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'subjects' && (
          <motion.div key="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {state.subjects.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">📚</div>
                <h3>No subjects yet</h3>
                <p>Add your subjects with topics and deadlines to get started with your study plan.</p>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                  <HiOutlinePlus /> Add Your First Subject
                </button>
              </div>
            ) : (
              <div className="grid-auto">
                {state.subjects.map(sub => (
                  <SubjectCard key={sub.id} subject={sub} dispatch={dispatch} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🗓️</div>
                <h3>No schedule yet</h3>
                <p>Add subjects and click "Generate Study Plan" to create your schedule.</p>
              </div>
            ) : (
              <div className="schedule-timeline">
                {Object.entries(groupedTasks).map(([date, tasks]) => (
                  <DayGroup key={date} date={date} tasks={tasks} dispatch={dispatch} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'tips' && (
          <motion.div key="tips" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="card">
              <div className="section-title"><HiOutlineLightningBolt className="icon" /> Study Tips</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '14px 16px', background: 'var(--bg-glass)',
                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                  }}>
                    <span style={{ color: 'var(--accent-tertiary)', flexShrink: 0 }}><HiOutlineLightningBolt /></span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Subject Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
            <motion.div
              className="modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className="modal-header">
                <h2>Add Subject</h2>
                <button className="btn btn-icon btn-secondary" onClick={() => setShowAddForm(false)}>
                  <HiOutlineX />
                </button>
              </div>
              <form onSubmit={handleAddSubject}>
                <div className="form-group">
                  <label>Subject Name</label>
                  <select
                    className="form-control"
                    value={newSubject.name}
                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                    required
                  >
                    <option value="">Select a subject...</option>
                    {SAMPLE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom">Other (type below)</option>
                  </select>
                  {newSubject.name === 'custom' && (
                    <input
                      type="text"
                      className="form-control"
                      style={{ marginTop: '8px' }}
                      placeholder="Enter custom subject name"
                      onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Topics (comma-separated)</label>
                  <textarea
                    className="form-control"
                    placeholder="e.g., Algebra, Calculus, Trigonometry, Statistics"
                    value={newSubject.topics}
                    onChange={e => setNewSubject({ ...newSubject, topics: e.target.value })}
                    required
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newSubject.deadline}
                      onChange={e => setNewSubject({ ...newSubject, deadline: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="form-control"
                      value={newSubject.priority}
                      onChange={e => setNewSubject({ ...newSubject, priority: e.target.value })}
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Subject</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .schedule-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .day-group {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .day-header {
          padding: 14px 20px;
          background: var(--bg-glass);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .day-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .day-tasks {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .schedule-task {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .schedule-task:hover {
          background: var(--bg-secondary);
        }
        .schedule-task .task-color {
          width: 4px;
          height: 32px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }
        .schedule-task-info { flex: 1; }
        .schedule-task-info .topic {
          font-size: 0.88rem;
          font-weight: 600;
        }
        .schedule-task-info .subject-name {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .subject-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-normal);
        }
        .subject-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-accent);
          box-shadow: var(--shadow-md);
        }
        .subject-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .subject-card-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .subject-card .topics {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        .subject-card .meta {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
      `}</style>
    </motion.div>
  );
}

function SubjectCard({ subject, dispatch }) {
  const daysLeft = Math.ceil((new Date(subject.deadline) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="subject-card">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: subject.color }} />
      <div className="subject-card-header">
        <h3>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, display: 'inline-block' }} />
          {subject.name}
        </h3>
        <button
          className="btn btn-icon btn-secondary btn-sm"
          onClick={() => dispatch({ type: 'REMOVE_SUBJECT', payload: subject.id })}
          style={{ width: 32, height: 32, fontSize: '0.8rem' }}
        >
          <HiOutlineTrash />
        </button>
      </div>
      <div className="topics">
        {subject.topics.map(t => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
      <div className="meta">
        <span>{new Date(subject.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className={`badge badge-${subject.priority === 'high' ? 'danger' : subject.priority === 'medium' ? 'warning' : 'info'}`}>
          {subject.priority}
        </span>
        <span style={{ marginLeft: 'auto', color: daysLeft <= 3 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
          {daysLeft > 0 ? `${daysLeft} days left` : 'Past due'}
        </span>
      </div>
    </div>
  );
}

function DayGroup({ date, tasks, dispatch }) {
  const dateObj = new Date(date + 'T00:00:00');
  const today = new Date().toISOString().split('T')[0];
  const isToday = date === today;
  const dayLabel = isToday
    ? 'Today'
    : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const completed = tasks.filter(t => t.completed).length;

  return (
    <div className="day-group">
      <div className="day-header">
        <h3 style={isToday ? { color: 'var(--accent-primary)' } : {}}>{dayLabel}</h3>
        <span className="badge badge-primary">{completed}/{tasks.length} done</span>
      </div>
      <div className="day-tasks">
        {tasks.map(task => (
          <div key={task.id} className="schedule-task">
            <div className="task-color" style={{ background: task.color || 'var(--accent-primary)' }} />
            <div className="schedule-task-info">
              <div className="topic" style={task.completed ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>
                {task.topic}
              </div>
              <div className="subject-name">
                {task.subjectName} • {task.duration}h
                {task.type === 'revision' && ' • Revision'}
              </div>
            </div>
            <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}`}>
              {task.priority}
            </span>
            <button
              className={`task-check ${task.completed ? 'done' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                border: `2px solid ${task.completed ? 'var(--accent-success)' : 'var(--border-color)'}`,
                background: task.completed ? 'var(--accent-success)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: task.completed ? 'white' : 'transparent', fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              {task.completed ? '✓' : ''}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
