import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { evaluatorAgent } from '../agents/evaluatorAgent';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineLightningBolt, HiOutlineCheck, HiOutlineX, HiOutlineChevronRight, HiOutlineTrendingUp, HiOutlineAcademicCap, HiOutlineClock } from 'react-icons/hi';

export default function Evaluator() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('quiz');
  const [quizConfig, setQuizConfig] = useState({ subject: '', topic: '', numQuestions: 5 });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const subjects = evaluatorAgent.getSubjects();
  const topics = quizConfig.subject ? evaluatorAgent.getTopics(quizConfig.subject) : [];
  const report = evaluatorAgent.getPerformanceReport(state.quizHistory);

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startQuiz = () => {
    if (!quizConfig.subject || !quizConfig.topic) return;
    const quiz = evaluatorAgent.generateQuiz(quizConfig.subject, quizConfig.topic, quizConfig.numQuestions);
    if (quiz.error) return;
    dispatch({ type: 'SET_CURRENT_QUIZ', payload: quiz });
    setCurrentQuestion(0);
    setAnswers({});
    setQuizResult(null);
    setTimeLeft(quiz.totalQuestions * 30); // 30 sec per question
    setTimerActive(true);
  };

  const handleAnswer = (questionIdx, answerIdx) => {
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }));
  };

  const handleSubmitQuiz = useCallback(() => {
    if (!state.currentQuiz) return;
    setTimerActive(false);
    const result = evaluatorAgent.evaluateQuiz(state.currentQuiz, answers);
    setQuizResult(result);
    dispatch({ type: 'ADD_QUIZ_RESULT', payload: result });
  }, [state.currentQuiz, answers, dispatch]);

  const resetQuiz = () => {
    dispatch({ type: 'SET_CURRENT_QUIZ', payload: null });
    setCurrentQuestion(0);
    setAnswers({});
    setQuizResult(null);
    setTimeLeft(0);
    setTimerActive(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1>Evaluator Agent</h1>
        <p className="subtitle">Take quizzes, track your performance, and identify areas to improve</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')}>
          Take Quiz
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          Performance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!state.currentQuiz && !quizResult ? (
              <QuizSetup
                config={quizConfig}
                setConfig={setQuizConfig}
                subjects={subjects}
                topics={topics}
                onStart={startQuiz}
              />
            ) : quizResult ? (
              <QuizResults result={quizResult} onRetry={resetQuiz} />
            ) : (
              <QuizInterface
                quiz={state.currentQuiz}
                currentQuestion={currentQuestion}
                setCurrentQuestion={setCurrentQuestion}
                answers={answers}
                onAnswer={handleAnswer}
                onSubmit={handleSubmitQuiz}
                timeLeft={timeLeft}
                formatTime={formatTime}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PerformanceDashboard report={report} quizHistory={state.quizHistory} />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .quiz-setup {
          max-width: 600px;
          margin: 0 auto;
        }
        .quiz-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 36px;
        }
        .quiz-card h2 {
          text-align: center;
          margin-bottom: 8px;
        }
        .quiz-card .subtitle {
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 28px;
          font-size: 0.9rem;
        }

        .quiz-progress {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 24px;
        }
        .quiz-progress-dot {
          flex: 1;
          height: 4px;
          border-radius: var(--radius-full);
          background: var(--bg-secondary);
          transition: background 0.3s ease;
        }
        .quiz-progress-dot.answered { background: var(--accent-primary); }
        .quiz-progress-dot.current { background: var(--accent-secondary); box-shadow: 0 0 8px var(--accent-secondary); }

        .question-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 32px;
        }
        .question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .question-number {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .question-timer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .question-text {
          font-size: 1.15rem;
          font-weight: 600;
          margin-bottom: 24px;
          line-height: 1.4;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 28px;
        }
        .option {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: var(--bg-glass);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-normal);
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-align: left;
          width: 100%;
        }
        .option:hover {
          border-color: var(--accent-primary);
          background: rgba(255,75,110,0.06);
          color: var(--text-primary);
        }
        .option.selected {
          border-color: var(--accent-primary);
          background: rgba(255,75,110,0.1);
          color: var(--text-primary);
        }
        .option-letter {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          background: var(--bg-secondary);
          flex-shrink: 0;
          transition: all var(--transition-normal);
        }
        .option.selected .option-letter {
          background: var(--accent-primary);
          color: white;
        }
        .question-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: 36px;
          text-align: center;
          margin-bottom: 24px;
        }
        .result-score {
          font-size: 4rem;
          font-weight: 800;
          font-family: var(--font-heading);
          margin: 16px 0 8px;
        }
        .result-grade {
          font-size: 1.2rem;
          margin-bottom: 8px;
        }
        .result-feedback {
          color: var(--text-secondary);
          font-size: 0.95rem;
          max-width: 500px;
          margin: 0 auto 24px;
          line-height: 1.6;
        }
        .result-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
        }
        .result-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          text-align: left;
        }
        .result-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .result-item-info { flex: 1; }
        .result-item-info .q {
          font-weight: 600;
          font-size: 0.88rem;
          margin-bottom: 6px;
        }
        .result-item-info .answers {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .result-item-info .explanation {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 6px;
          font-style: italic;
        }

        .perf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .perf-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          text-align: center;
        }
        .perf-card h3 {
          font-size: 2rem;
          font-weight: 800;
          margin: 8px 0 4px;
        }
        .perf-card p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .score-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
        }
        .score-bar-label {
          font-size: 0.85rem;
          font-weight: 600;
          min-width: 120px;
        }
        .score-bar-track {
          flex: 1;
          height: 8px;
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.6s ease;
        }
        .score-bar-value {
          font-size: 0.85rem;
          font-weight: 700;
          min-width: 44px;
          text-align: right;
        }
      `}</style>
    </motion.div>
  );
}

function QuizSetup({ config, setConfig, subjects, topics, onStart }) {
  return (
    <div className="quiz-setup">
      <div className="quiz-card">
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '8px' }}>🧠</div>
        <h2>Start a Quiz</h2>
        <p className="subtitle">Test your knowledge and track your progress</p>

        <div className="form-group">
          <label>Subject</label>
          <select
            className="form-control"
            value={config.subject}
            onChange={e => setConfig({ ...config, subject: e.target.value, topic: '' })}
          >
            <option value="">Select a subject...</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Topic</label>
          <select
            className="form-control"
            value={config.topic}
            onChange={e => setConfig({ ...config, topic: e.target.value })}
            disabled={!config.subject}
          >
            <option value="">Select a topic...</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Number of Questions</label>
          <select
            className="form-control"
            value={config.numQuestions}
            onChange={e => setConfig({ ...config, numQuestions: parseInt(e.target.value) })}
          >
            <option value={3}>3 Questions</option>
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions (All)</option>
          </select>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onStart}
          disabled={!config.subject || !config.topic}
        >
          <HiOutlineLightningBolt /> Start Quiz
        </button>
      </div>
    </div>
  );
}

function QuizInterface({ quiz, currentQuestion, setCurrentQuestion, answers, onAnswer, onSubmit, timeLeft, formatTime }) {
  const question = quiz.questions[currentQuestion];
  const isLast = currentQuestion === quiz.totalQuestions - 1;
  const allAnswered = Object.keys(answers).length === quiz.totalQuestions;
  const timerDanger = timeLeft < 30;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Progress */}
      <div className="quiz-progress">
        {quiz.questions.map((_, i) => (
          <div
            key={i}
            className={`quiz-progress-dot ${answers[i] !== undefined ? 'answered' : ''} ${i === currentQuestion ? 'current' : ''}`}
          />
        ))}
      </div>

      <div className="question-container">
        <div className="question-header">
          <span className="question-number">Question {currentQuestion + 1} of {quiz.totalQuestions}</span>
          <div
            className="question-timer"
            style={{
              background: timerDanger ? 'rgba(255,75,110,0.12)' : 'rgba(255,75,110,0.1)',
              color: timerDanger ? 'var(--accent-danger)' : 'var(--accent-primary)',
            }}
          >
            <HiOutlineClock /> {formatTime(timeLeft)}
          </div>
        </div>

        <div className="question-text">{question.question}</div>

        <div className="options">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              className={`option ${answers[currentQuestion] === idx ? 'selected' : ''}`}
              onClick={() => onAnswer(currentQuestion, idx)}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        <div className="question-nav">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            {quiz.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: i === currentQuestion ? 'var(--accent-primary)' : answers[i] !== undefined ? 'rgba(255,75,110,0.12)' : 'var(--bg-secondary)',
                  color: i === currentQuestion ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s ease',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {isLast || allAnswered ? (
            <button className="btn btn-success" onClick={onSubmit}>
              Submit Quiz ✓
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentQuestion(prev => prev + 1)}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizResults({ result, onRetry }) {
  const scoreColor = result.percentage >= 80 ? 'var(--accent-success)'
    : result.percentage >= 60 ? 'var(--accent-warning)'
    : 'var(--accent-danger)';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="result-card">
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-body)' }}>{result.grade.letter}</div>
        <div className="result-score" style={{ color: scoreColor }}>
          {result.percentage}%
        </div>
        <div className="result-grade">
          <span className="badge" style={{ background: `${scoreColor}20`, color: scoreColor, fontSize: '0.9rem', padding: '6px 16px' }}>
            {result.grade.label}
          </span>
        </div>
        <p className="result-feedback">{result.feedback}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onRetry}>
            Take Another Quiz
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Detailed Results</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {result.subject} → {result.topic} • {result.score}/{result.totalQuestions} correct
        </div>
        <div className="result-details">
          {result.results.map((r, i) => (
            <div key={i} className="result-item">
              <div className="result-icon" style={{
                background: r.isCorrect ? 'rgba(0,230,118,0.12)' : 'rgba(255,75,110,0.12)',
                color: r.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)',
              }}>
                {r.isCorrect ? <HiOutlineCheck /> : <HiOutlineX />}
              </div>
              <div className="result-item-info">
                <div className="q">{r.question}</div>
                <div className="answers">
                  <span>Your answer: <strong style={{ color: r.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{r.userAnswer}</strong></span>
                  {!r.isCorrect && <span>Correct answer: <strong style={{ color: 'var(--accent-success)' }}>{r.correctAnswer}</strong></span>}
                </div>
                <div className="explanation">{r.explanation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformanceDashboard({ report, quizHistory }) {
  if (!report.totalQuizzes) {
    return (
      <div className="empty-state">
        <div className="emoji">📊</div>
        <h3>No quiz history yet</h3>
        <p>Take your first quiz to start tracking your performance!</p>
      </div>
    );
  }

  const avgColor = report.averageScore >= 80 ? 'var(--accent-success)'
    : report.averageScore >= 60 ? 'var(--accent-warning)'
    : 'var(--accent-danger)';

  return (
    <div>
      {/* Overview */}
      <div className="perf-grid">
        <div className="perf-card">
          <HiOutlineAcademicCap style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }} />
          <h3 style={{ color: 'var(--accent-primary)' }}>{report.totalQuizzes}</h3>
          <p>Quizzes Taken</p>
        </div>
        <div className="perf-card">
          <HiOutlineTrendingUp style={{ fontSize: '1.5rem', color: avgColor }} />
          <h3 style={{ color: avgColor }}>{report.averageScore}%</h3>
          <p>Average Score</p>
        </div>
        <div className="perf-card">
          <HiOutlineAcademicCap style={{ fontSize: '1.5rem', color: avgColor }} />
          <h3 style={{ color: avgColor }}>{report.grade.letter}</h3>
          <p>Overall Grade</p>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="section-title"><HiOutlineTrendingUp className="icon" /> Performance by Topic</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(report.subjectReport).map(([subject, data]) => (
              Object.entries(data.topics).map(([topic, avg]) => {
                const color = avg >= 80 ? 'var(--accent-success)' : avg >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
                return (
                  <div key={`${subject}-${topic}`} className="score-bar">
                    <span className="score-bar-label">{topic}</span>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${avg}%`, background: color }} />
                    </div>
                    <span className="score-bar-value" style={{ color }}>{avg}%</span>
                  </div>
                );
              })
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Strengths & Weaknesses</div>
          {report.strengths.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-success)', marginBottom: '8px' }}>Strengths</h4>
              {report.strengths.map(s => (
                <div key={s} style={{ padding: '8px 12px', background: 'rgba(0,230,118,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {s}
                </div>
              ))}
            </div>
          )}
          {report.weaknesses.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-danger)', marginBottom: '8px' }}>⚠️ Needs Work</h4>
              {report.weaknesses.map(w => (
                <div key={w} style={{ padding: '8px 12px', background: 'rgba(255,75,110,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {w}
                </div>
              ))}
            </div>
          )}
          {report.strengths.length === 0 && report.weaknesses.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Take more quizzes to identify patterns in your performance.</p>
          )}
        </div>
      </div>

      {/* Recent Scores */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="section-title">🕐 Recent Quiz Scores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {report.recentScores.map((s, i) => {
            const color = s.score >= 80 ? 'var(--accent-success)' : s.score >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: 'var(--bg-glass)',
                border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontWeight: 700, color, fontSize: '1.1rem', minWidth: '50px' }}>{s.score}%</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.topic}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.subject}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
