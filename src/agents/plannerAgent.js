import { formatLocalDateKey } from '../utils/dateUtils';
import { apiFetch } from '../lib/api';

// Planner Agent — Creates study schedules based on subjects, topics, and deadlines

export const plannerAgent = {
  name: 'Planner Agent',
  description: 'Creates optimized study schedules based on your subjects, topics, and deadlines.',

  // ─── Schedule Generation ────────────────────────────────────────────────

  // AI-powered schedule via backend (falls back to null on failure)
  async generateAISchedule(subjects) {
    try {
      const res = await apiFetch('/api/planner/generate', {
        method: 'POST',
        body: { subjects },
      });
      const data = await res.json();
      if (data.fallback || !res.ok || !Array.isArray(data.tasks)) return null;
      return data.tasks;
    } catch {
      return null;
    }
  },

  // AI-generated per-topic learning objectives (the curriculum "contract" the
  // Evaluator and Tutor read via the shared context briefing).
  async generateLearningObjectives(subjects) {
    try {
      const res = await apiFetch('/api/planner/objectives', {
        method: 'POST',
        body: { subjects },
      });
      const data = await res.json();
      if (!res.ok || data.fallback || !data.objectives) return null;
      return data.objectives;
    } catch {
      return null;
    }
  },

  // Local rule-based schedule with deadline/difficulty/priority weighting
  generateSchedule(subjects) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Per-day hours cap to avoid overloading
    const MAX_DAILY_HOURS = 6;
    const dailyLoad = {}; // date string → hours used

    const claimDay = (dateStr, hours) => {
      dailyLoad[dateStr] = (dailyLoad[dateStr] || 0) + hours;
    };

    const nextAvailableDay = (fromDay, hours) => {
      const d = new Date(today);
      d.setDate(d.getDate() + fromDay);
      for (let i = 0; i < 90; i++) {
        const s = formatLocalDateKey(d);
        if ((dailyLoad[s] || 0) + hours <= MAX_DAILY_HOURS) return { date: d, dateStr: s };
        d.setDate(d.getDate() + 1);
      }
      return { date: d, dateStr: formatLocalDateKey(d) };
    };

    // Session duration: priority × difficulty matrix
    const sessionHours = (priority, difficulty, estimatedHours, topicsCount) => {
      if (estimatedHours && topicsCount > 0) {
        // If user gave an estimate, distribute it evenly across topics (+1 for revision)
        return Math.max(1, Math.round(estimatedHours / (topicsCount + 1)));
      }
      const base = { high: 3, medium: 2, low: 1 };
      const diffMult = { hard: 1.5, medium: 1, easy: 0.75 };
      return Math.max(1, Math.round((base[priority] || 2) * (diffMult[difficulty] || 1)));
    };

    // Sort subjects by urgency: earlier deadline first, then priority
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const sorted = [...subjects].sort((a, b) => {
      const da = new Date(a.deadline) - today;
      const db = new Date(b.deadline) - today;
      if (da !== db) return da - db;
      return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
    });

    const tasks = [];

    sorted.forEach(subject => {
      const deadline = new Date(subject.deadline);
      deadline.setHours(23, 59, 59, 999);
      const totalDays = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)));
      const topics = subject.topics || [];
      if (topics.length === 0) return;

      const hours = sessionHours(subject.priority, subject.difficulty, subject.estimatedHours, topics.length);
      // Space topics evenly across available days (leave 1 day for revision)
      const usableDays = Math.max(1, totalDays - 1);
      const gap = Math.max(1, Math.floor(usableDays / topics.length));
      let dayOffset = 0;

      topics.forEach((topic, idx) => {
        const { dateStr } = nextAvailableDay(dayOffset, hours);
        claimDay(dateStr, hours);

        tasks.push({
          id: `${subject.id}-${idx}`,
          subjectId: subject.id,
          subjectName: subject.name,
          topic,
          date: dateStr,
          duration: hours,
          priority: subject.priority,
          difficulty: subject.difficulty || 'medium',
          completed: false,
          type: 'study',
          color: subject.color || '#6C63FF',
        });

        dayOffset += gap;
      });

      // Revision session 1 day before deadline
      const revisionDate = new Date(deadline);
      revisionDate.setDate(revisionDate.getDate() - 1);
      if (revisionDate >= today) {
        const revDateStr = formatLocalDateKey(revisionDate);
        const revHours = Math.max(1, Math.ceil(hours * 0.75));
        claimDay(revDateStr, revHours);
        tasks.push({
          id: `${subject.id}-revision`,
          subjectId: subject.id,
          subjectName: subject.name,
          topic: `Revision: All ${subject.name} topics`,
          date: revDateStr,
          duration: revHours,
          priority: 'high',
          difficulty: subject.difficulty || 'medium',
          completed: false,
          type: 'revision',
          color: subject.color || '#6C63FF',
        });
      }
    });

    tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    return tasks;
  },

  // ─── Local (instant) rule-based coaching ────────────────────────────────

  getLocalInsights(subjects, studyPlan) {
    if (!subjects || subjects.length === 0) return null;
    const today = new Date();
    const progress = this.getProgress(studyPlan);

    const urgent = subjects
      .map(s => ({ ...s, daysLeft: Math.ceil((new Date(s.deadline) - today) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const mostUrgent = urgent[0];
    const hasOverdue = urgent.some(s => s.daysLeft < 0);
    const hasCritical = urgent.some(s => s.daysLeft >= 0 && s.daysLeft <= 3);

    let summary, encouragement, recommendation;

    if (hasOverdue) {
      summary = 'You have overdue subjects — focus on them immediately.';
      encouragement = "Every hour you study now counts. Don't give up!";
      recommendation = `Start with ${mostUrgent.name} right now — even 30 minutes helps.`;
    } else if (hasCritical) {
      summary = `${mostUrgent.name} is due in ${mostUrgent.daysLeft} day${mostUrgent.daysLeft === 1 ? '' : 's'} — it needs your full attention today.`;
      encouragement = 'Intense focus now means confidence on exam day.';
      recommendation = `Block 2–3 hours today for ${mostUrgent.name} before anything else.`;
    } else if (progress.percentage < 20 && progress.total > 3) {
      summary = 'Your schedule is set but you have not started many tasks yet.';
      encouragement = 'The hardest part is starting — tick off one task today!';
      recommendation = 'Complete at least one task today to build momentum.';
    } else if (progress.percentage >= 70) {
      summary = `Great work — ${progress.percentage}% done with ${progress.total - progress.completed} tasks left.`;
      encouragement = "You're almost there. Stay consistent for the final stretch!";
      recommendation = `Review ${mostUrgent.name} today to consolidate what you've learned.`;
    } else {
      summary = `You're ${progress.percentage}% through your study plan with ${subjects.length} subjects on track.`;
      encouragement = 'Solid progress! Keep your daily study habit going.';
      recommendation = `Today, focus on ${mostUrgent.name} — it has the closest deadline.`;
    }

    return {
      summary,
      urgentSubject: mostUrgent?.name || null,
      encouragement,
      recommendation,
      isLocal: true,
    };
  },

  // ─── AI Insights ────────────────────────────────────────────────────────

  async getInsights(subjects, studyPlan) {
    try {
      const res = await apiFetch('/api/planner/insights', {
        method: 'POST',
        body: { subjects, studyPlan },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // ─── Progress & Stats ───────────────────────────────────────────────────

  getProgress(tasks) {
    if (tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = tasks.filter(t => t.completed).length;
    return {
      completed,
      total: tasks.length,
      percentage: Math.round((completed / tasks.length) * 100),
    };
  },

  getTotalHours(tasks) {
    return tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  },

  getSubjectProgress(tasks, subjectId) {
    const subTasks = tasks.filter(t => t.subjectId === subjectId);
    if (subTasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = subTasks.filter(t => t.completed).length;
    return {
      completed,
      total: subTasks.length,
      percentage: Math.round((completed / subTasks.length) * 100),
    };
  },

  // Count consecutive days (from today backwards) that had tasks and all were completed
  getStudyStreak(tasks) {
    if (tasks.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalDateKey(d);
      const dayTasks = tasks.filter(t => t.date === dateStr);

      if (dayTasks.length === 0) {
        // No tasks scheduled — skip day (don't break streak)
        continue;
      }
      const allDone = dayTasks.every(t => t.completed);
      const someDone = dayTasks.some(t => t.completed);

      if (i === 0) {
        // Today: streak still alive if at least some done or none needed yet
        if (someDone) streak++;
        // otherwise today is in progress — don't break
      } else {
        if (allDone) {
          streak++;
        } else {
          break;
        }
      }
    }

    return streak;
  },

  getDailyPlan(tasks, date) {
    const dateStr = typeof date === 'string' ? date : formatLocalDateKey(date);
    return tasks.filter(t => t.date === dateStr);
  },

  // Returns tasks for a 7-day window starting from startDate
  getWeekPlan(tasks, startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = formatLocalDateKey(d);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        tasks: tasks.filter(t => t.date === dateStr),
      });
    }
    return days;
  },

  // ─── Study Tips ─────────────────────────────────────────────────────────

  getStudyTips(subject) {
    const tips = {
      Mathematics: [
        'Practice problems daily — repetition builds fluency.',
        'Focus on understanding concepts before memorizing formulas.',
        'Work through examples step by step before attempting exercises.',
        'Use visual aids like graphs and diagrams.',
      ],
      Science: [
        'Connect theory to real-world examples.',
        'Create mind maps for complex topics.',
        'Review lab experiments and their conclusions.',
        'Explain concepts aloud to test your understanding.',
      ],
      'Computer Science': [
        'Write code daily — even small programs help.',
        'Debug by reading code line by line.',
        'Understand algorithms before implementing them.',
        'Build small projects to apply concepts.',
      ],
      History: [
        'Create timelines to visualize events.',
        'Focus on cause-and-effect relationships.',
        'Use mnemonics for dates and names.',
        'Read primary sources when possible.',
      ],
      English: [
        'Read widely to improve vocabulary and style.',
        'Practice writing essays with clear structure.',
        'Analyze literary devices in assigned readings.',
        'Keep a vocabulary journal for new words.',
      ],
      Physics: [
        'Master the fundamental equations first.',
        'Draw free-body diagrams for mechanics problems.',
        'Relate physics concepts to everyday scenarios.',
        'Practice unit conversions until they are automatic.',
      ],
      Chemistry: [
        'Memorize the periodic table trends.',
        'Balance equations regularly for practice.',
        'Understand reaction mechanisms, not just products.',
        'Use molecular models to visualize 3D structures.',
      ],
      Biology: [
        'Create diagrams of biological processes.',
        'Use flashcards for terminology.',
        'Connect structure to function in every system.',
        'Review with practice questions after each chapter.',
      ],
    };

    return (
      tips[subject] || [
        'Break study sessions into 25-min focused blocks (Pomodoro).',
        'Review notes within 24 hours of class.',
        'Teach someone else to solidify understanding.',
        'Take short breaks to maintain concentration.',
      ]
    );
  },
};
