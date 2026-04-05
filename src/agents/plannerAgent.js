// Planner Agent — Creates study schedules based on subjects, topics, and deadlines

export const plannerAgent = {
  name: 'Planner Agent',
  description: 'Creates optimized study schedules based on your subjects, topics, and deadlines.',

  generateSchedule(subjects) {
    const tasks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    subjects.forEach(subject => {
      const deadline = new Date(subject.deadline);
      deadline.setHours(23, 59, 59, 999);
      const totalDays = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)));
      const topics = subject.topics || [];
      if (topics.length === 0) return;

      // Distribute topics across available days
      const daysPerTopic = Math.max(1, Math.floor(totalDays / (topics.length + 1))); // +1 for revision
      let currentDay = 0;

      topics.forEach((topic, idx) => {
        const studyDate = new Date(today);
        studyDate.setDate(studyDate.getDate() + currentDay);

        // Estimate study duration based on priority
        const priorityHours = { high: 3, medium: 2, low: 1 };
        const hours = priorityHours[subject.priority] || 2;

        tasks.push({
          id: `${subject.id}-${idx}`,
          subjectId: subject.id,
          subjectName: subject.name,
          topic: topic,
          date: studyDate.toISOString().split('T')[0],
          duration: hours,
          priority: subject.priority,
          completed: false,
          type: 'study',
          color: subject.color || '#6C63FF',
        });

        currentDay += daysPerTopic;
      });

      // Add revision day before deadline
      const revisionDate = new Date(deadline);
      revisionDate.setDate(revisionDate.getDate() - 1);
      if (revisionDate >= today) {
        tasks.push({
          id: `${subject.id}-revision`,
          subjectId: subject.id,
          subjectName: subject.name,
          topic: `Revision: All ${subject.name} topics`,
          date: revisionDate.toISOString().split('T')[0],
          duration: priorityHours(subject.priority),
          priority: 'high',
          completed: false,
          type: 'revision',
          color: subject.color || '#6C63FF',
        });
      }
    });

    // Sort by date
    tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    return tasks;
  },

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

    return tips[subject] || [
      'Break study sessions into 25-min focused blocks (Pomodoro).',
      'Review notes within 24 hours of class.',
      'Teach someone else to solidify understanding.',
      'Take short breaks to maintain concentration.',
    ];
  },

  getDailyPlan(tasks, date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return tasks.filter(t => t.date === dateStr);
  },

  getProgress(tasks) {
    if (tasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = tasks.filter(t => t.completed).length;
    return {
      completed,
      total: tasks.length,
      percentage: Math.round((completed / tasks.length) * 100),
    };
  },
};

function priorityHours(priority) {
  const map = { high: 3, medium: 2, low: 1 };
  return map[priority] || 2;
}
