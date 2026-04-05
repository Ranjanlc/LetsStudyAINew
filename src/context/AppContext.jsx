import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const STORAGE_KEY = 'letsstudyai-data';

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

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultState, ...JSON.parse(stored) };
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return defaultState;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function appReducer(state, action) {
  switch (action.type) {
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
  const [state, dispatch] = useReducer(appReducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

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
