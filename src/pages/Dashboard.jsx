import { useApp } from '../context/AppContext';
import { formatLocalDateKey } from '../utils/dateUtils';
import { Link } from 'react-router-dom';
import { HiOutlineBookOpen, HiOutlineClock, HiOutlineLightningBolt, HiOutlineCheckCircle, HiOutlineCalendar, HiOutlineAcademicCap, HiOutlineClipboardCheck, HiOutlineArrowRight, HiOutlineTrendingUp } from 'react-icons/hi';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const quotes = [
  "The beautiful thing about learning is that no one can take it away from you.",
  "Education is the most powerful weapon you can use to change the world.",
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your limitation—it's only your imagination.",
  "Dream it. Wish it. Do it.",
  "The future belongs to those who believe in the beauty of their dreams.",
];

export default function Dashboard() {
  const { state } = useApp();
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const totalSubjects = state.subjects.length;
  const totalTasks = state.studyPlan.length;
  const completedTasks = state.studyPlan.filter(t => t.completed).length;
  const totalQuizzes = state.quizHistory.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(state.quizHistory.reduce((s, q) => s + q.percentage, 0) / totalQuizzes)
    : 0;

  const todayStr = formatLocalDateKey();
  const todayTasks = state.studyPlan.filter(t => t.date === todayStr);
  const upcomingTasks = state.studyPlan
    .filter(t => !t.completed && t.date >= todayStr)
    .slice(0, 5);

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Hero */}
      <motion.div variants={item} className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome back, <span className="gradient-text">{state.user.name}</span>
          </h1>
          <p className="hero-quote">"{quote}"</p>
          <div className="hero-actions">
            <Link to="/planner" className="btn btn-primary btn-lg">
              <HiOutlineCalendar /> Start Planning
            </Link>
            <Link to="/tutor" className="btn btn-secondary btn-lg">
              <HiOutlineAcademicCap /> Learn Now
            </Link>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="stats-grid">
        <StatCard
          icon={<HiOutlineBookOpen />}
          value={totalSubjects}
          label="Active Subjects"
          color="var(--accent-primary)"
          gradient="var(--gradient-primary)"
        />
        <StatCard
          icon={<HiOutlineClock />}
          value={totalTasks}
          label="Study Tasks"
          color="var(--accent-secondary)"
          gradient="var(--gradient-primary)"
        />
        <StatCard
          icon={<HiOutlineCheckCircle />}
          value={totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '—'}
          label="Plan Progress"
          color="var(--accent-success)"
          gradient="var(--gradient-success)"
        />
        <StatCard
          icon={<HiOutlineTrendingUp />}
          value={totalQuizzes > 0 ? `${avgScore}%` : '—'}
          label="Avg Quiz Score"
          color="var(--accent-warning)"
          gradient="var(--gradient-warm)"
        />
      </motion.div>

      {/* Main grid */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Today's Tasks */}
        <motion.div variants={item} className="card">
          <div className="section-title">
            <HiOutlineLightningBolt className="icon" /> Today's Tasks
          </div>
          {todayTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="emoji">📅</div>
              <h3>No tasks for today</h3>
              <p>Add subjects and generate a study plan to see tasks here.</p>
              <Link to="/planner" className="btn btn-primary btn-sm">
                <HiOutlineCalendar /> Go to Planner
              </Link>
            </div>
          ) : (
            <div className="task-list">
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming */}
        <motion.div variants={item} className="card">
          <div className="section-title">
            <HiOutlineCalendar className="icon" /> Upcoming Schedule
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="emoji">🗓️</div>
              <h3>Schedule is clear</h3>
              <p>Create a study plan to see your upcoming tasks.</p>
            </div>
          ) : (
            <div className="task-list">
              {upcomingTasks.map(task => (
                <TaskItem key={task.id} task={task} showDate />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Access Agent Cards */}
      <motion.div variants={item} className="section" style={{ marginTop: '28px' }}>
        <div className="section-title"><HiOutlineLightningBolt className="icon" /> AI Agents</div>
        <div className="grid-3">
          <AgentCard
            title="Planner Agent"
            description="Create study schedules, manage subjects, and track your progress toward deadlines."
            Icon={HiOutlineCalendar}
            color="var(--accent-primary)"
            link="/planner"
            features={['Study Schedule', 'Task Management', 'Deadline Tracking']}
          />
          <AgentCard
            title="Tutor Agent"
            description="Get interactive explanations, ask questions, and explore concepts across multiple subjects."
            Icon={HiOutlineAcademicCap}
            color="var(--accent-secondary)"
            link="/tutor"
            features={['Concept Explanations', 'Q&A Chat', 'Topic Browser']}
          />
          <AgentCard
            title="Evaluator Agent"
            description="Take quizzes, get instant feedback, and track your performance over time."
            Icon={HiOutlineClipboardCheck}
            color="var(--accent-success)"
            link="/evaluator"
            features={['Quiz Generation', 'Auto-Grading', 'Performance Analytics']}
          />
        </div>
      </motion.div>

      <style>{`
        .dashboard-hero {
          background: var(--gradient-hero);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 44px 48px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .hero-content { position: relative; z-index: 2; }
        .hero-title {
          font-size: 2.4rem;
          font-weight: 700;
          margin-bottom: 12px;
          font-family: var(--font-heading);
          color: var(--text-primary);
          letter-spacing: -0.03em;
        }
        .gradient-text {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-quote {
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-style: italic;
          margin-bottom: 28px;
          max-width: 520px;
          padding-left: 14px;
          border-left: 2px solid rgba(123,97,255,0.4);
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .hero-decoration { position: absolute; top: 0; right: 0; bottom: 0; width: 50%; pointer-events: none; }
        .hero-orb {
          position: absolute;
          border-radius: 50%;
          animation: float 7s ease-in-out infinite;
        }
        .hero-orb-1 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(123,97,255,0.15), transparent);
          top: -20%; right: 5%;
        }
        .hero-orb-2 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(224,64,251,0.1), transparent);
          bottom: -10%; right: 30%;
          animation-delay: -3s;
        }
        .hero-orb-3 {
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(0,229,255,0.08), transparent);
          top: 15%; right: 50%;
          animation-delay: -5s;
        }

        .task-list { display: flex; flex-direction: column; gap: 8px; }

        .task-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: all var(--transition-normal);
        }
        .task-item:hover {
          border-color: var(--border-accent);
          background: var(--bg-secondary);
        }
        .task-color {
          width: 4px; height: 36px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }
        .task-info { flex: 1; }
        .task-info .task-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .task-info .task-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .task-check {
          width: 20px; height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          background: transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          color: transparent;
          font-size: 12px;
        }
        .task-check.done {
          background: var(--accent-success);
          border-color: var(--accent-success);
          color: white;
        }
        .task-check:hover {
          border-color: var(--accent-success);
        }

        .agent-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 28px;
          transition: all var(--transition-normal);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .agent-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }
        .agent-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-accent);
          box-shadow: var(--shadow-md);
        }
        .agent-card-icon {
          width: 44px; height: 44px;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
          margin-bottom: 16px;
          color: white;
        }
        .agent-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .agent-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
          line-height: 1.5;
          flex: 1;
        }
        .agent-features {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 20px;
        }
        .agent-feature {
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 500;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
        }
        .agent-card-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: gap var(--transition-normal);
        }
        .agent-card-link:hover { gap: 10px; }

        @media (max-width: 768px) {
          .hero-title { font-size: 1.5rem; }
          .dashboard-hero { padding: 28px 24px; }
          .hero-decoration { display: none; }
        }
      `}</style>
    </motion.div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div className="stat-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <h3 style={{ color }}>{value}</h3>
        <p>{label}</p>
      </div>
      <style>{`
        .stat-card::after { background: ${color}; }
      `}</style>
    </div>
  );
}

function TaskItem({ task, showDate }) {
  const { dispatch } = useApp();
  return (
    <div className="task-item">
      <div className="task-color" style={{ background: task.color || 'var(--accent-primary)' }} />
      <div className="task-info">
        <div className="task-name">{task.topic}</div>
        <div className="task-meta">
          <span>{task.subjectName}</span>
          {showDate && <span>• {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          <span>• {task.duration}h</span>
          <span className={`badge badge-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'info'}`}>
            {task.priority}
          </span>
        </div>
      </div>
      <button
        className={`task-check ${task.completed ? 'done' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}
      >
        {task.completed ? '✓' : ''}
      </button>
    </div>
  );
}

function AgentCard({ title, description, Icon, color, link, features }) {
  return (
    <div className="agent-card">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
      <div className="agent-card-icon" style={{ background: color }}><Icon /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="agent-features">
        {features.map(f => <span key={f} className="agent-feature">{f}</span>)}
      </div>
      <Link to={link} className="agent-card-link" style={{ color }}>
        Open Agent <HiOutlineArrowRight />
      </Link>
    </div>
  );
}
