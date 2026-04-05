import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { evaluatorAgent } from '../agents/evaluatorAgent';
import { motion } from 'framer-motion';
import { HiOutlineUser, HiOutlinePencil, HiOutlineCheck, HiOutlineSave, HiOutlineTrash, HiOutlineTrendingUp, HiOutlineBookOpen, HiOutlineAcademicCap } from 'react-icons/hi';

const AVATARS = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🧑‍🏫', '🦸‍♂️', '🦸‍♀️', '🚀', '🎯'];

export default function Profile() {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...state.user });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const report = evaluatorAgent.getPerformanceReport(state.quizHistory);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_USER', payload: form });
    setEditing(false);
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_DATA' });
    setShowResetConfirm(false);
    setForm({ ...state.user });
  };

  const totalStudyHours = state.studyPlan
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>👤 Profile</h1>
        <p className="subtitle">Manage your settings and view your overall progress</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--gradient-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', margin: '0 auto 16px',
              boxShadow: 'var(--shadow-glow-accent)',
            }}>
              {state.user.avatar}
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{state.user.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{state.user.grade}</p>
          </div>

          {!editing ? (
            <div>
              <ProfileField label="Name" value={state.user.name} />
              <ProfileField label="Grade/Year" value={state.user.grade} />
              <ProfileField label="Study Goal" value={state.user.goals} />
              <ProfileField label="Daily Hours Goal" value={`${state.user.studyHoursGoal} hours`} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-primary" onClick={() => { setForm({ ...state.user }); setEditing(true); }}>
                  <HiOutlinePencil /> Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label>Avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setForm({ ...form, avatar: a })}
                      style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none',
                        background: form.avatar === a ? 'var(--accent-primary)' : 'var(--bg-glass)',
                        fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >{a}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Grade / Year</label>
                <input
                  className="form-control"
                  value={form.grade}
                  onChange={e => setForm({ ...form, grade: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Study Goal</label>
                <input
                  className="form-control"
                  value={form.goals}
                  onChange={e => setForm({ ...form, goals: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Daily Study Hours Goal</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.studyHoursGoal}
                  min={1}
                  max={12}
                  onChange={e => setForm({ ...form, studyHoursGoal: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={handleSave}>
                  <HiOutlineSave /> Save
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="section-title"><HiOutlineTrendingUp className="icon" /> Overall Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <MiniStat icon={<HiOutlineBookOpen />} value={state.subjects.length} label="Subjects" color="var(--accent-primary)" />
              <MiniStat icon={<HiOutlineCheck />} value={state.studyPlan.filter(t => t.completed).length} label="Tasks Done" color="var(--accent-success)" />
              <MiniStat icon={<HiOutlineAcademicCap />} value={state.quizHistory.length} label="Quizzes" color="var(--accent-secondary)" />
              <MiniStat icon="⏱️" value={`${totalStudyHours}h`} label="Study Hours" color="var(--accent-warning)" />
            </div>
          </div>

          {report.totalQuizzes > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="section-title">{report.grade.emoji} Quiz Performance</div>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: report.averageScore >= 80 ? 'var(--accent-success)' : report.averageScore >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                  {report.averageScore}%
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Average across {report.totalQuizzes} quizzes</p>
              </div>
              <div className="progress-bar" style={{ marginTop: '12px' }}>
                <div className="progress-fill" style={{
                  width: `${report.averageScore}%`,
                  background: report.averageScore >= 80 ? 'var(--gradient-success)' : report.averageScore >= 60 ? 'var(--gradient-warm)' : 'var(--gradient-danger)',
                }} />
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: 'rgba(255,82,82,0.2)' }}>
            <div className="section-title" style={{ color: 'var(--accent-danger)' }}>⚠️ Danger Zone</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Reset all data including subjects, study plans, chat history, and quiz history.
            </p>
            {!showResetConfirm ? (
              <button className="btn btn-danger btn-sm" onClick={() => setShowResetConfirm(true)}>
                <HiOutlineTrash /> Reset All Data
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-danger)' }}>Are you sure?</span>
                <button className="btn btn-danger btn-sm" onClick={handleReset}>Yes, Reset</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-field {
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .profile-field:last-of-type {
          border-bottom: none;
        }
        .profile-field label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          display: block;
          margin-bottom: 4px;
        }
        .profile-field span {
          font-size: 0.95rem;
          color: var(--text-primary);
        }
        .mini-stat {
          padding: 14px;
          background: var(--bg-glass);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .mini-stat .icon {
          font-size: 1.3rem;
          margin-bottom: 6px;
        }
        .mini-stat h4 {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 2px;
        }
        .mini-stat p {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
      `}</style>
    </motion.div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="profile-field">
      <label>{label}</label>
      <span>{value}</span>
    </div>
  );
}

function MiniStat({ icon, value, label, color }) {
  return (
    <div className="mini-stat">
      <div className="icon" style={{ color }}>{icon}</div>
      <h4 style={{ color }}>{value}</h4>
      <p>{label}</p>
    </div>
  );
}
