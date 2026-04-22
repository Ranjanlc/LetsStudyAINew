import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HiOutlineHome, HiOutlineCalendar, HiOutlineAcademicCap,
  HiOutlineClipboardCheck, HiOutlineUser, HiOutlineDocumentText,
  HiOutlineBookOpen, HiOutlineMoon, HiOutlineSun,
  HiOutlineLogout,
} from 'react-icons/hi';

const navItems = [
  { path: '/',           icon: HiOutlineHome,           label: 'Dashboard' },
  { path: '/planner',    icon: HiOutlineCalendar,        label: 'Planner' },
  { path: '/tutor',      icon: HiOutlineAcademicCap,     label: 'Tutor' },
  { path: '/evaluator',  icon: HiOutlineClipboardCheck,  label: 'Evaluator' },
  { path: '/documents',  icon: HiOutlineDocumentText,    label: 'Documents' },
  { path: '/profile',    icon: HiOutlineUser,            label: 'Profile' },
];

export default function Sidebar() {
  const { state } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = (state.user.name || 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isLight = theme === 'light';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <HiOutlineBookOpen />
        </div>
        <div className="sidebar-brand">
          <h1>LetsStudyAI</h1>
          <span>Multi-Agent System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Menu</div>
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

        <div className="nav-section-title" style={{ marginTop: 12 }}>Appearance</div>
        <button className="nav-item theme-toggle-btn" onClick={toggleTheme}>
          {isLight
            ? <HiOutlineMoon className="nav-icon" />
            : <HiOutlineSun className="nav-icon" />
          }
          <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
          <span className="theme-pill">{isLight ? 'Dark' : 'Light'}</span>
        </button>

        <div className="nav-section-title" style={{ marginTop: 12 }}>Account</div>
        <button type="button" className="nav-item theme-toggle-btn" onClick={handleLogout}>
          <HiOutlineLogout className="nav-icon" />
          <span>Log out</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className="sidebar-user" style={{ textDecoration: 'none' }}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="name">{state.user.name}</span>
            <span className="role">{state.user.grade}</span>
          </div>
        </NavLink>
      </div>

      <style>{`
        .theme-toggle-btn {
          width: 100%;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: var(--font-body);
          text-align: left;
        }
        .theme-pill {
          margin-left: auto;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 2px 7px;
          border-radius: 99px;
          background: rgba(123,97,255,0.2);
          color: #a78bfa;
          flex-shrink: 0;
        }
        [data-theme="light"] .theme-pill {
          background: rgba(201,58,14,0.14);
          color: #C93A0E;
        }
      `}</style>
    </aside>
  );
}
