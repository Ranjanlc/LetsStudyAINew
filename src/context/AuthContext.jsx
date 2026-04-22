import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { API_ORIGIN, getAuthToken, setAuthToken, clearAuthToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getAuthToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!getAuthToken());

  const setToken = useCallback((t) => {
    setTokenState(t);
    if (t) setAuthToken(t);
    else clearAuthToken();
  }, []);

  const verifySession = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('unauthorized');
      const data = await res.json();
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    return data;
  }, [setToken]);

  const register = useCallback(async (email, password, profile = {}) => {
    const res = await fetch(`${API_ORIGIN}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, profile }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setToken(data.token);
    setUser(data.user);
    return data;
  }, [setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout, setToken }),
    [token, user, loading, login, register, logout, setToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
