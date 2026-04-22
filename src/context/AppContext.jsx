import { createContext, useContext, useReducer, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { API_ORIGIN, getAuthToken } from '../lib/api';

const AppContext = createContext();

const defaultState = {
  user: {
    name: 'Student',
    grade: '12th Grade',
    avatar: '👨‍🎓',
    subjects: [],
    goals: 'Ace my exams!',
    studyHoursGoal: 4,
  },
  subjects: [],
  studyPlan: [],
  chatHistory: [],
  quizHistory: [],
  currentQuiz: null,
  notifications: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE_STATE': {
      const p = action.payload || {};
      return {
        ...defaultState,
        ...p,
        user: { ...defaultState.user, ...(p.user || {}) },
      };
    }

    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.payload] };

    case 'REMOVE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.filter(s => s.id !== action.payload),
        studyPlan: state.studyPlan.filter(t => t.subjectId !== action.payload),
      };

    case 'UPDATE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s),
      };

    case 'SET_STUDY_PLAN':
      return { ...state, studyPlan: action.payload };

    case 'TOGGLE_TASK':
      return {
        ...state,
        studyPlan: state.studyPlan.map(t =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        ),
      };

    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };

    case 'CLEAR_CHAT':
      return { ...state, chatHistory: [] };

    case 'SET_CURRENT_QUIZ':
      return { ...state, currentQuiz: action.payload };

    case 'ADD_QUIZ_RESULT':
      return {
        ...state,
        quizHistory: [...state.quizHistory, action.payload],
        currentQuiz: null,
      };

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 20),
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'RESET_DATA':
      return defaultState;

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const { token, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef(null);
  const hydratedTokenRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      dispatch({ type: 'HYDRATE_STATE', payload: defaultState });
      setHydrated(true);
      hydratedTokenRef.current = null;
      return;
    }

    let cancelled = false;
    setHydrated(false);

    (async () => {
      const currentToken = getAuthToken();
      try {
        const res = await fetch(`${API_ORIGIN}/api/user/state`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.state) {
          dispatch({ type: 'HYDRATE_STATE', payload: data.state });
        } else {
          dispatch({ type: 'HYDRATE_STATE', payload: defaultState });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'HYDRATE_STATE', payload: defaultState });
      } finally {
        if (!cancelled) {
          hydratedTokenRef.current = currentToken;
          setHydrated(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token, authLoading]);

  useEffect(() => {
    if (!token || !hydrated || authLoading) return;
    if (hydratedTokenRef.current !== token) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const t = getAuthToken();
        if (!t) return;
        await fetch(`${API_ORIGIN}/api/user/state`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify(state),
        });
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, token, hydrated, authLoading]);

  if (authLoading || (token && !hydrated)) {
    return (
      <div className="auth-loading-screen">
        <p>Loading your workspace…</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
