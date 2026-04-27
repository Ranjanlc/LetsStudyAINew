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
  // Document library hierarchy mirrored from /api/subjects
  // Shape: [{ id, name, color, chapters: [{ id, name, documents: [...] }] }]
  library: [],
  // IDs of documents that are currently used as context for the Tutor & Evaluator
  activeDocumentIds: [],

  // ─── Shared cross-agent context ────────────────────────────────────────
  // Per-topic mastery state, fed by Evaluator quiz outcomes and consumed by
  // Tutor (remediation) and Planner (roadmap progress).
  // Shape: { [topicName]: {
  //   status: 'mastered' | 'weak' | 'tracking',
  //   score: number,           // last percentage (0..100)
  //   attempts: number,
  //   lastSubject: string|null,
  //   lastAttemptAt: ISOString,
  // }}
  topicMastery: {},

  // Per-chapter/topic learning objectives produced by the Planner.
  // Keyed by topic name (lowercased) so any agent can look them up.
  // Shape: { [topicNameLower]: { topic: string, subject: string, objectives: string[] } }
  learningObjectives: {},

  // Cross-agent suggestion queue. Producers append items; consumers (e.g. Tutor)
  // surface them and then mark them as `read` so they aren't shown twice.
  // Item shape:
  //   { id, kind: 'remediation', topic, subject, score, createdAt, read }
  agentInbox: [],
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

    case 'SET_LIBRARY':
      return { ...state, library: action.payload || [] };

    case 'SET_ACTIVE_DOCUMENT_IDS':
      return { ...state, activeDocumentIds: action.payload || [] };

    case 'TOGGLE_ACTIVE_DOCUMENT': {
      const id = action.payload;
      const has = state.activeDocumentIds.includes(id);
      return {
        ...state,
        activeDocumentIds: has
          ? state.activeDocumentIds.filter(d => d !== id)
          : [...state.activeDocumentIds, id],
      };
    }

    // ─── Cross-agent baton-pass actions ─────────────────────────────────
    case 'SET_LEARNING_OBJECTIVES':
      return { ...state, learningObjectives: action.payload || {} };

    case 'MERGE_LEARNING_OBJECTIVES': {
      const incoming = action.payload || {};
      return {
        ...state,
        learningObjectives: { ...state.learningObjectives, ...incoming },
      };
    }

    /**
     * Records the outcome of a quiz so the rest of the app (Planner, Tutor)
     * can react to it.
     *
     * payload: {
     *   subject, topic, percentage,
     *   topicBreakdown?: [{ topic, correct, total }],
     *   completedAt: ISOString,
     * }
     *
     * Side effects on state:
     *   - topicMastery for each topic gets updated (mastered ≥ 80, weak < 60)
     *   - studyPlan tasks for mastered topics get marked completed
     *   - Weak topics produce a remediation suggestion in agentInbox
     */
    case 'RECORD_QUIZ_OUTCOME': {
      const p = action.payload || {};
      const completedAt = p.completedAt || new Date().toISOString();
      const breakdown = Array.isArray(p.topicBreakdown) && p.topicBreakdown.length > 0
        ? p.topicBreakdown
        : [{ topic: p.topic, correct: null, total: null, percentage: p.percentage }];
      const overallPct = Number.isFinite(Number(p.percentage))
        ? Math.round(Number(p.percentage))
        : null;
      const primaryTopic = String(p.topic || '').trim().toLowerCase();
      const singleTopicQuiz = breakdown.length === 1;

      const mastery = { ...(state.topicMastery || {}) };
      const newRemediations = [];
      let masteredTopics = new Set();

      for (const item of breakdown) {
        const topic = (item.topic || p.topic || '').trim();
        if (!topic) continue;
        const isPrimaryTopic = primaryTopic && topic.toLowerCase() === primaryTopic;
        const rawPct = item.percentage != null
          ? item.percentage
          : (item.total ? Math.round((item.correct / item.total) * 100) : p.percentage);
        // Keep Tutor remediation score aligned with what the student sees in the
        // quiz result card for single-topic quizzes (or the quiz's primary topic).
        const pct = (singleTopicQuiz || isPrimaryTopic) && overallPct != null
          ? overallPct
          : (Number.isFinite(Number(rawPct)) ? Math.round(Number(rawPct)) : 0);
        const prev = mastery[topic] || { attempts: 0 };
        const status = pct >= 80 ? 'mastered' : pct < 60 ? 'weak' : 'tracking';
        mastery[topic] = {
          status,
          score: pct,
          attempts: (prev.attempts || 0) + 1,
          lastSubject: p.subject || prev.lastSubject || null,
          lastAttemptAt: completedAt,
        };
        if (status === 'mastered') masteredTopics.add(topic.toLowerCase());
        if (status === 'weak') {
          newRemediations.push({
            id: `rem-${topic}-${Date.now()}`,
            kind: 'remediation',
            topic,
            subject: p.subject || prev.lastSubject || null,
            score: pct,
            createdAt: completedAt,
            read: false,
          });
        }
      }

      // Roadmap progress: mark study tasks for mastered topics as completed.
      const studyPlan = state.studyPlan.map(t => {
        if (t.completed) return t;
        const tTopic = (t.topic || '').toLowerCase();
        return masteredTopics.has(tTopic) ? { ...t, completed: true } : t;
      });

      // Dedupe remediation by topic — keep newest, drop older entries for same topic.
      const remTopics = new Set(newRemediations.map(r => r.topic.toLowerCase()));
      const inbox = [
        ...newRemediations,
        ...(state.agentInbox || []).filter(it =>
          it.kind !== 'remediation' || !remTopics.has((it.topic || '').toLowerCase())
        ),
      ].slice(0, 50);

      return { ...state, topicMastery: mastery, studyPlan, agentInbox: inbox };
    }

    case 'MARK_INBOX_READ': {
      const id = action.payload;
      return {
        ...state,
        agentInbox: (state.agentInbox || []).map(it =>
          it.id === id ? { ...it, read: true } : it
        ),
      };
    }

    case 'CLEAR_AGENT_INBOX':
      return { ...state, agentInbox: [] };

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
