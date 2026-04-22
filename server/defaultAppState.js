// Mirrors frontend defaultState (server-side default for new users)
module.exports = {
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
