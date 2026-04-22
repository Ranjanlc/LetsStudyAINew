import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { login, token, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) navigate('/', { replace: true });
  }, [token, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="auth-loading-screen"><p>Checking session…</p></div>;
  }

  return (
    <motion.div
      className="auth-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your study plans and notes</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <label className="auth-label">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </label>
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg-primary, #0f0f12);
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          padding: 32px 28px;
          border-radius: var(--radius-lg, 16px);
          background: var(--bg-secondary, #1a1a22);
          border: 1px solid var(--border-color, rgba(255,255,255,0.08));
          box-shadow: 0 24px 48px rgba(0,0,0,0.35);
        }
        .auth-card h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
        }
        .auth-subtitle {
          margin: 0 0 24px;
          color: var(--text-muted, #9ca3af);
          font-size: 0.95rem;
        }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .auth-error {
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255,75,110,0.12);
          color: #ff6b8a;
          font-size: 0.9rem;
        }
        .auth-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-secondary, #d1d5db);
        }
        .auth-label svg { display: none; }
        .auth-input {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color, rgba(255,255,255,0.12));
          background: var(--bg-primary, #0f0f12);
          color: var(--text-primary, #fff);
          font-size: 1rem;
        }
        .auth-input:focus {
          outline: none;
          border-color: var(--accent-primary, #7B61FF);
        }
        .auth-submit {
          margin-top: 8px;
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          background: linear-gradient(135deg, #7B61FF, #5a4fcf);
          color: #fff;
        }
        .auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-footer {
          margin: 20px 0 0;
          text-align: center;
          color: var(--text-muted, #9ca3af);
          font-size: 0.9rem;
        }
        .auth-footer a { color: var(--accent-primary, #a78bfa); }
        .auth-loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #9ca3af);
        }
      `}</style>
    </motion.div>
  );
}
