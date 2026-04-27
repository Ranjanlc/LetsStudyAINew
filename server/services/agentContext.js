/**
 * Shared agent-context service ("baton pass" architecture).
 *
 * Reads the user's persisted app state (`user_app_state.state` JSONB) and
 * derives a compact briefing that any agent (Tutor, Evaluator) can inject as
 * system context. This is how:
 *
 *   - Planner → Tutor: the tutor sees the current week's roadmap + objectives.
 *   - Planner → Evaluator: the quiz prompt sees the chapter's learning
 *     objectives so it can target them.
 *   - Evaluator → Planner: weak topics flagged here are surfaced back to the
 *     Tutor (proactive remediation) and Planner (roadmap reweighting).
 */

const { getPool } = require('../db/pool');
const defaultAppState = require('../defaultAppState');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function loadUserAppState(userId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT state FROM user_app_state WHERE user_id = $1',
    [userId],
  );
  const raw = rows[0]?.state;
  if (!raw || typeof raw !== 'object') return { ...defaultAppState };
  return { ...defaultAppState, ...raw };
}

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/**
 * Pick the "current focus" — the subject most relevant right now.
 * Heuristic: subject with the soonest upcoming deadline whose tasks are not all
 * completed; falls back to the subject with the most incomplete tasks.
 */
function pickCurrentSubject(state) {
  const subjects = Array.isArray(state.subjects) ? state.subjects : [];
  if (subjects.length === 0) return null;
  const today = startOfDay(new Date());
  const studyPlan = Array.isArray(state.studyPlan) ? state.studyPlan : [];

  const ranked = subjects
    .map(s => {
      const tasks = studyPlan.filter(t => t.subjectId === s.id);
      const incomplete = tasks.filter(t => !t.completed).length;
      const deadlineMs = s.deadline ? new Date(s.deadline).getTime() : Infinity;
      const daysLeft = Number.isFinite(deadlineMs)
        ? Math.ceil((deadlineMs - today.getTime()) / MS_PER_DAY)
        : 9999;
      return { subject: s, incomplete, daysLeft };
    })
    .sort((a, b) => {
      // Prioritize: nearest deadline first, then most incomplete tasks.
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return b.incomplete - a.incomplete;
    });

  return ranked[0]?.subject || null;
}

/** Tasks scheduled in the next 7 days (incl. today). */
function tasksThisWeek(state) {
  const studyPlan = Array.isArray(state.studyPlan) ? state.studyPlan : [];
  const today = startOfDay(new Date());
  const weekEnd = new Date(today.getTime() + 7 * MS_PER_DAY);
  return studyPlan.filter(t => {
    const d = t.date ? new Date(t.date) : null;
    return d && d >= today && d <= weekEnd;
  });
}

function pickWeakTopics(topicMastery, max = 5) {
  const entries = Object.entries(topicMastery || {});
  return entries
    .filter(([, m]) => m && m.status === 'weak')
    .sort((a, b) => (a[1].score || 0) - (b[1].score || 0))
    .slice(0, max)
    .map(([topic, m]) => ({ topic, score: m.score, subject: m.lastSubject }));
}

function pickMasteredTopics(topicMastery, max = 8) {
  return Object.entries(topicMastery || {})
    .filter(([, m]) => m && m.status === 'mastered')
    .slice(0, max)
    .map(([topic]) => topic);
}

/**
 * Look up learning objectives for a topic name (case-insensitive).
 * Returns an array of objective strings, or [] if none recorded.
 */
function objectivesForTopic(state, topicName) {
  if (!topicName) return [];
  const map = state.learningObjectives || {};
  const key = String(topicName).trim().toLowerCase();
  const entry = map[key] || map[topicName] || null;
  return Array.isArray(entry?.objectives) ? entry.objectives : [];
}

/**
 * Build the compact "study briefing" text that gets injected into the Tutor's
 * system prompt. The Tutor uses this to align answers with the student's
 * roadmap and to gently nudge them on weak topics.
 *
 * Returns an empty string when there's no signal to share.
 */
function buildTutorBriefing(state) {
  const lines = [];
  const subject = pickCurrentSubject(state);
  const week = tasksThisWeek(state);
  const weak = pickWeakTopics(state.topicMastery);
  const mastered = pickMasteredTopics(state.topicMastery);

  if (subject) {
    const dl = subject.deadline ? new Date(subject.deadline).toISOString().slice(0, 10) : 'no deadline';
    lines.push(`Current focus subject: ${subject.name} (deadline ${dl}, priority ${subject.priority || 'medium'}).`);
    if (Array.isArray(subject.topics) && subject.topics.length > 0) {
      lines.push(`Topics for this subject: ${subject.topics.slice(0, 8).join(', ')}.`);
    }
  }

  if (week.length > 0) {
    const todays = week
      .filter(t => t.date === new Date().toISOString().slice(0, 10))
      .map(t => `${t.subjectName} · ${t.topic}`);
    if (todays.length > 0) {
      lines.push(`Today's plan: ${todays.slice(0, 4).join('; ')}.`);
    } else {
      const upcoming = week.slice(0, 3).map(t => `${t.subjectName} · ${t.topic}`);
      lines.push(`Upcoming this week: ${upcoming.join('; ')}.`);
    }
  }

  // Surface objectives for the focus subject's first incomplete topic, if any.
  if (subject && Array.isArray(subject.topics)) {
    for (const topic of subject.topics) {
      const objs = objectivesForTopic(state, topic);
      if (objs.length > 0) {
        lines.push(`Learning objectives for "${topic}": ${objs.slice(0, 4).join('; ')}.`);
        break;
      }
    }
  }

  if (weak.length > 0) {
    lines.push(
      `Weak topics flagged from recent quizzes (offer remediation when relevant): ${
        weak.map(w => `${w.topic} (${w.score}%)`).join(', ')
      }.`,
    );
  }

  if (mastered.length > 0) {
    lines.push(`Topics the student has already mastered (don't over-explain): ${mastered.join(', ')}.`);
  }

  if (lines.length === 0) return '';

  return [
    'STUDY ROADMAP CONTEXT (from the Planner & Evaluator agents):',
    ...lines.map(l => `- ${l}`),
    'Use this context to tailor your answer; if the user asks something off-topic, still answer them, but you may briefly tie it back to their roadmap.',
  ].join('\n');
}

/**
 * Briefing for the Evaluator. Tells the quiz generator which learning
 * objectives to cover and which topics are currently weak (so the quiz can
 * over-sample those).
 */
function buildEvaluatorBriefing(state, focusTopic) {
  const lines = [];

  // If the student is generating a quiz on a specific topic, surface its
  // Planner-defined objectives directly.
  if (focusTopic) {
    const objs = objectivesForTopic(state, focusTopic);
    if (objs.length > 0) {
      lines.push(`The Planner defined these learning objectives for "${focusTopic}":`);
      for (const o of objs.slice(0, 6)) lines.push(`  • ${o}`);
      lines.push('At least one question per objective if possible.');
    }
  }

  const weak = pickWeakTopics(state.topicMastery, 3);
  if (weak.length > 0) {
    lines.push(
      `Topics the student previously struggled with: ${
        weak.map(w => `${w.topic} (${w.score}%)`).join(', ')
      }. Reinforce them when relevant.`,
    );
  }

  if (lines.length === 0) return '';
  return ['ROADMAP CONTEXT (from the Planner & Evaluator history):', ...lines].join('\n');
}

module.exports = {
  loadUserAppState,
  pickCurrentSubject,
  tasksThisWeek,
  pickWeakTopics,
  pickMasteredTopics,
  objectivesForTopic,
  buildTutorBriefing,
  buildEvaluatorBriefing,
};
