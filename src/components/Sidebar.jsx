import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { HiOutlineHome, HiOutlineCalendar, HiOutlineAcademicCap, HiOutlineClipboardCheck, HiOutlineUser, HiOutlineDocumentText } from 'react-icons/hi';

const navItems = [
  { path: '/', icon: HiOutlineHome, label: 'Dashboard' },
  { path: '/planner', icon: HiOutlineCalendar, label: 'Planner Agent' },
  { path: '/tutor', icon: HiOutlineAcademicCap, label: 'Tutor Agent' },
  { path: '/evaluator', icon: HiOutlineClipboardCheck, label: 'Evaluator Agent' },
  { path: '/documents', icon: HiOutlineDocumentText, label: 'My Documents' },
  { path: '/profile', icon: HiOutlineUser, label: 'Profile' },
];

export default function Sidebar() {
  const { state } = useApp();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🧠</div>
        <div className="sidebar-brand">
          <h1>LetsStudyAI</h1>
          <span>Multi-Agent System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-title" style={{ marginTop: '16px' }}>AI Agents</div>
        <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AgentStatus name="Planner" status="Ready" color="var(--accent-primary)" />
          <AgentStatus name="Tutor" status="Ready" color="var(--accent-secondary)" />
          <AgentStatus name="Evaluator" status="Ready" color="var(--accent-success)" />
        </div>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className="sidebar-user" style={{ textDecoration: 'none' }}>
          <div className="sidebar-avatar">{state.user.avatar}</div>
          <div className="sidebar-user-info">
            <span className="name">{state.user.name}</span>
            <span className="role">{state.user.grade}</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

function AgentStatus({ name, status, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.75rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        animation: 'pulse 2s infinite',
      }} />
      <span>{name}</span>
      <span style={{ marginLeft: 'auto', color, fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>
        {status}
      </span>
    </div>
  );
}
