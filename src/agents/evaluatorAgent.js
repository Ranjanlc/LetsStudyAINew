// Evaluator Agent — Generates quizzes, evaluates answers, tracks performance

const questionBank = {
  Mathematics: {
    'Algebra': [
      { id: 'alg1', question: 'What is the solution to 2x + 6 = 14?', options: ['x = 3', 'x = 4', 'x = 5', 'x = 2'], correct: 1, explanation: '2x = 14 - 6 = 8, so x = 8/2 = 4' },
      { id: 'alg2', question: 'Which of the following is a quadratic equation?', options: ['2x + 3 = 0', 'x² + 2x + 1 = 0', '3x = 9', 'x/2 = 4'], correct: 1, explanation: 'A quadratic equation has the highest power of x as 2' },
      { id: 'alg3', question: 'Simplify: 3(x + 2) - 2(x - 1)', options: ['x + 8', 'x + 4', '5x + 4', 'x + 6'], correct: 0, explanation: '3x + 6 - 2x + 2 = x + 8' },
      { id: 'alg4', question: 'What is the value of x if x² = 49?', options: ['x = 7 only', 'x = ±7', 'x = -7 only', 'x = 49'], correct: 1, explanation: 'x² = 49 means x = 7 or x = -7' },
      { id: 'alg5', question: 'Factor: x² - 9', options: ['(x-3)(x+3)', '(x-9)(x+1)', '(x-3)²', '(x+9)(x-1)'], correct: 0, explanation: 'Difference of squares: a² - b² = (a-b)(a+b)' },
    ],
    'Calculus': [
      { id: 'cal1', question: 'What is the derivative of x³?', options: ['3x', 'x²', '3x²', '3x³'], correct: 2, explanation: 'Using power rule: d/dx(xⁿ) = nxⁿ⁻¹, so d/dx(x³) = 3x²' },
      { id: 'cal2', question: 'What is ∫x dx?', options: ['x²', 'x²/2 + C', '2x + C', '1 + C'], correct: 1, explanation: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C, so ∫x dx = x²/2 + C' },
      { id: 'cal3', question: 'The derivative represents:', options: ['Area under curve', 'Instantaneous rate of change', 'Average value', 'Maximum point'], correct: 1, explanation: 'The derivative gives the instantaneous rate of change at a point' },
      { id: 'cal4', question: 'What is the derivative of sin(x)?', options: ['-sin(x)', 'cos(x)', '-cos(x)', 'tan(x)'], correct: 1, explanation: 'The derivative of sin(x) is cos(x)' },
      { id: 'cal5', question: 'What is lim(x→0) sin(x)/x?', options: ['0', '∞', '1', 'undefined'], correct: 2, explanation: 'This is a fundamental limit: lim(x→0) sin(x)/x = 1' },
    ],
    'Trigonometry': [
      { id: 'tri1', question: 'What is sin(90°)?', options: ['0', '0.5', '1', '-1'], correct: 2, explanation: 'sin(90°) = 1 (on the unit circle, the y-coordinate at 90° is 1)' },
      { id: 'tri2', question: 'Which identity is correct?', options: ['sin²θ + cos²θ = 2', 'sin²θ + cos²θ = 1', 'sinθ + cosθ = 1', 'tan²θ + 1 = sin²θ'], correct: 1, explanation: 'The Pythagorean identity: sin²θ + cos²θ = 1' },
      { id: 'tri3', question: 'tan(θ) equals:', options: ['sin/cos', 'cos/sin', 'sin×cos', '1/sin'], correct: 0, explanation: 'tan(θ) = sin(θ)/cos(θ)' },
      { id: 'tri4', question: 'What is cos(0°)?', options: ['0', '0.5', '1', '-1'], correct: 2, explanation: 'cos(0°) = 1' },
    ],
    'Statistics': [
      { id: 'stat1', question: 'The mean of {2, 4, 6, 8, 10} is:', options: ['5', '6', '7', '8'], correct: 1, explanation: 'Mean = (2+4+6+8+10)/5 = 30/5 = 6' },
      { id: 'stat2', question: 'The median of {1, 3, 3, 6, 7} is:', options: ['3', '4', '6', '7'], correct: 0, explanation: 'Middle value of sorted data: 3' },
      { id: 'stat3', question: 'Standard deviation measures:', options: ['Central tendency', 'Data spread', 'Data count', 'Maximum value'], correct: 1, explanation: 'Standard deviation quantifies the amount of variation in data' },
      { id: 'stat4', question: 'Which is NOT a measure of central tendency?', options: ['Mean', 'Median', 'Mode', 'Range'], correct: 3, explanation: 'Range measures spread, not central tendency' },
    ],
  },
  Science: {
    'Newton\'s Laws': [
      { id: 'new1', question: 'Newton\'s First Law is also called the law of:', options: ['Force', 'Inertia', 'Gravity', 'Motion'], correct: 1, explanation: 'The 1st law describes inertia — tendency to resist change in motion' },
      { id: 'new2', question: 'F = ma represents which law?', options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravity'], correct: 1, explanation: 'Newton\'s Second Law: Force = mass × acceleration' },
      { id: 'new3', question: 'Every action has an equal and opposite reaction. This is:', options: ['1st Law', '2nd Law', '3rd Law', 'Law of Conservation'], correct: 2, explanation: 'Newton\'s Third Law of Motion' },
      { id: 'new4', question: 'A 10 kg object with 20 N force. Acceleration?', options: ['2 m/s²', '10 m/s²', '200 m/s²', '0.5 m/s²'], correct: 0, explanation: 'a = F/m = 20/10 = 2 m/s²' },
    ],
    'Cell Biology': [
      { id: 'cell1', question: 'Which organelle is the "powerhouse of the cell"?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 2, explanation: 'Mitochondria produce ATP through cellular respiration' },
      { id: 'cell2', question: 'DNA is found in the:', options: ['Cell membrane', 'Cytoplasm', 'Nucleus', 'Ribosome'], correct: 2, explanation: 'DNA is stored in the nucleus of eukaryotic cells' },
      { id: 'cell3', question: 'Which is NOT found in animal cells?', options: ['Nucleus', 'Cell wall', 'Mitochondria', 'Ribosomes'], correct: 1, explanation: 'Cell walls are found in plant cells, not animal cells' },
      { id: 'cell4', question: 'Prokaryotic cells lack:', options: ['Cell membrane', 'DNA', 'Nucleus', 'Ribosomes'], correct: 2, explanation: 'Prokaryotes do not have a membrane-bound nucleus' },
    ],
    'Periodic Table': [
      { id: 'pt1', question: 'Elements in the same group have similar:', options: ['Mass', 'Chemical properties', 'Color', 'Size'], correct: 1, explanation: 'Groups (columns) contain elements with similar chemical behavior' },
      { id: 'pt2', question: 'Noble gases are in Group:', options: ['1', '7', '14', '18'], correct: 3, explanation: 'Noble gases (He, Ne, Ar, etc.) are in Group 18' },
      { id: 'pt3', question: 'Atomic number equals the number of:', options: ['Neutrons', 'Protons', 'Electrons only', 'Mass units'], correct: 1, explanation: 'Atomic number = number of protons in the nucleus' },
    ],
  },
  'Computer Science': {
    'Data Structures': [
      { id: 'ds1', question: 'Which data structure uses LIFO?', options: ['Queue', 'Stack', 'Array', 'Linked List'], correct: 1, explanation: 'Stack: Last In, First Out. Think of a stack of plates.' },
      { id: 'ds2', question: 'Array access by index is:', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], correct: 2, explanation: 'Arrays allow constant-time access by index' },
      { id: 'ds3', question: 'Which structure is FIFO?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1, explanation: 'Queue: First In, First Out. Like a line at a store.' },
      { id: 'ds4', question: 'A binary tree node has at most __ children:', options: ['1', '2', '3', 'unlimited'], correct: 1, explanation: 'Binary: each node has at most 2 children (left and right)' },
      { id: 'ds5', question: 'Hash table average lookup time is:', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], correct: 2, explanation: 'Hash tables provide O(1) average lookup using hash functions' },
    ],
    'Algorithms': [
      { id: 'algo1', question: 'Binary search requires data to be:', options: ['Random', 'Sorted', 'Unique', 'Positive'], correct: 1, explanation: 'Binary search only works on sorted arrays/lists' },
      { id: 'algo2', question: 'Time complexity of Merge Sort:', options: ['O(n)', 'O(n²)', 'O(n log n)', 'O(log n)'], correct: 2, explanation: 'Merge Sort has O(n log n) time complexity in all cases' },
      { id: 'algo3', question: 'Bubble Sort worst case is:', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'], correct: 2, explanation: 'Bubble Sort compares adjacent pairs: O(n²) in worst case' },
      { id: 'algo4', question: 'BFS uses which data structure?', options: ['Stack', 'Queue', 'Heap', 'Array'], correct: 1, explanation: 'BFS (Breadth-First Search) uses a queue to explore level by level' },
    ],
    'OOP': [
      { id: 'oop1', question: 'Encapsulation means:', options: ['Hiding implementation details', 'Creating subclasses', 'Using interfaces', 'Multiple inheritance'], correct: 0, explanation: 'Encapsulation bundles data with methods and restricts direct access' },
      { id: 'oop2', question: 'Creating a child class from a parent class is:', options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'], correct: 2, explanation: 'Inheritance allows a class to derive from another class' },
      { id: 'oop3', question: 'Same method name, different behavior is:', options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Coupling'], correct: 1, explanation: 'Polymorphism: same interface, different implementations' },
      { id: 'oop4', question: 'A class is a:', options: ['Variable', 'Blueprint for objects', 'Function', 'Loop'], correct: 1, explanation: 'A class defines the structure and behavior that objects will have' },
    ],
  },
  Physics: {
    'Mechanics': [
      { id: 'mech1', question: 'Momentum equals:', options: ['m × a', 'm × v', 'F × t', 'F / m'], correct: 1, explanation: 'Momentum p = mass × velocity' },
      { id: 'mech2', question: 'Unit of acceleration is:', options: ['m/s', 'm/s²', 'kg·m/s', 'N'], correct: 1, explanation: 'Acceleration = change in velocity / time = m/s²' },
      { id: 'mech3', question: 'An object in free fall accelerates at:', options: ['5 m/s²', '9.8 m/s²', '15 m/s²', '0 m/s²'], correct: 1, explanation: 'g ≈ 9.8 m/s² (acceleration due to gravity on Earth)' },
      { id: 'mech4', question: 'Kinetic energy formula:', options: ['½mv²', 'mgh', 'Fd', 'mv'], correct: 0, explanation: 'KE = ½mv² (kinetic energy depends on mass and velocity squared)' },
    ],
    'Thermodynamics': [
      { id: 'therm1', question: 'First law of thermodynamics is about:', options: ['Entropy', 'Energy conservation', 'Absolute zero', 'Equilibrium'], correct: 1, explanation: '1st Law: energy cannot be created or destroyed, only transformed' },
      { id: 'therm2', question: 'Entropy always increases in:', options: ['Open systems', 'Closed systems', 'Isolated systems', 'All systems'], correct: 2, explanation: '2nd Law: entropy of an isolated system always increases' },
      { id: 'therm3', question: 'Absolute zero is:', options: ['0°C', '-273.15°C', '-100°C', '0°F'], correct: 1, explanation: 'Absolute zero = 0 K = -273.15°C, the lowest possible temperature' },
    ],
  },
  Chemistry: {
    'Chemical Bonding': [
      { id: 'bond1', question: 'Ionic bonds form between:', options: ['Two metals', 'Two nonmetals', 'Metal and nonmetal', 'Noble gases'], correct: 2, explanation: 'Ionic bonds: metal transfers electrons to nonmetal' },
      { id: 'bond2', question: 'Covalent bonds involve:', options: ['Electron transfer', 'Electron sharing', 'Proton sharing', 'Nuclear fusion'], correct: 1, explanation: 'Covalent: atoms share electron pairs' },
      { id: 'bond3', question: 'NaCl is an example of:', options: ['Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond'], correct: 1, explanation: 'Na (metal) transfers electron to Cl (nonmetal) = ionic bond' },
    ],
    'Stoichiometry': [
      { id: 'stoi1', question: 'Avogadro\'s number is approximately:', options: ['6.022 × 10²³', '3.14 × 10⁸', '1.6 × 10⁻¹⁹', '9.8 × 10¹'], correct: 0, explanation: '1 mole = 6.022 × 10²³ particles' },
      { id: 'stoi2', question: 'Molar mass of H₂O is:', options: ['16 g/mol', '18 g/mol', '20 g/mol', '2 g/mol'], correct: 1, explanation: 'H₂O: 2(1) + 16 = 18 g/mol' },
      { id: 'stoi3', question: 'In a balanced equation, mass is:', options: ['Created', 'Destroyed', 'Conserved', 'Doubled'], correct: 2, explanation: 'Law of conservation of mass: mass is conserved in reactions' },
    ],
  },
  Biology: {
    'Genetics': [
      { id: 'gen1', question: 'DNA base pairs: A pairs with', options: ['G', 'C', 'T', 'U'], correct: 2, explanation: 'Adenine (A) pairs with Thymine (T) in DNA' },
      { id: 'gen2', question: 'A dominant allele is represented by:', options: ['lowercase letter', 'UPPERCASE letter', 'number', 'symbol'], correct: 1, explanation: 'Convention: uppercase = dominant, lowercase = recessive' },
      { id: 'gen3', question: 'Genotype Aa is:', options: ['Homozygous dominant', 'Homozygous recessive', 'Heterozygous', 'Codominant'], correct: 2, explanation: 'Aa has two different alleles = heterozygous' },
      { id: 'gen4', question: 'Mutations are changes in:', options: ['Proteins', 'DNA sequence', 'Cell membrane', 'Organelles'], correct: 1, explanation: 'Mutations are alterations in the nucleotide sequence of DNA' },
    ],
    'Evolution': [
      { id: 'evo1', question: 'Natural selection was proposed by:', options: ['Mendel', 'Darwin', 'Newton', 'Einstein'], correct: 1, explanation: 'Charles Darwin proposed evolution by natural selection' },
      { id: 'evo2', question: '"Survival of the fittest" relates to:', options: ['Strongest organisms', 'Best adapted organisms', 'Largest organisms', 'Oldest organisms'], correct: 1, explanation: 'Fittest = best adapted to the environment, not necessarily strongest' },
      { id: 'evo3', question: 'Homologous structures suggest:', options: ['Common ancestor', 'Similar function', 'Same species', 'Parallel evolution'], correct: 0, explanation: 'Homologous structures indicate descent from a common ancestor' },
    ],
  },
};

export const evaluatorAgent = {
  name: 'Evaluator Agent',
  description: 'Generates quizzes, evaluates performance, and provides detailed feedback.',

  getSubjects() {
    return Object.keys(questionBank);
  },

  getTopics(subject) {
    return questionBank[subject] ? Object.keys(questionBank[subject]) : [];
  },

  generateQuiz(subject, topic, numQuestions = 5) {
    if (!questionBank[subject] || !questionBank[subject][topic]) {
      return { error: 'No questions available for this subject/topic.' };
    }

    const allQuestions = [...questionBank[subject][topic]];
    // Shuffle
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }

    const selected = allQuestions.slice(0, Math.min(numQuestions, allQuestions.length));

    return {
      id: `quiz-${Date.now()}`,
      subject,
      topic,
      questions: selected,
      totalQuestions: selected.length,
      createdAt: new Date().toISOString(),
    };
  },

  evaluateQuiz(quiz, answers) {
    let score = 0;
    const results = [];

    quiz.questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer === q.correct;
      if (isCorrect) score++;

      results.push({
        question: q.question,
        userAnswer: userAnswer !== undefined ? q.options[userAnswer] : 'Not answered',
        correctAnswer: q.options[q.correct],
        isCorrect,
        explanation: q.explanation,
      });
    });

    const percentage = Math.round((score / quiz.questions.length) * 100);

    return {
      quizId: quiz.id,
      subject: quiz.subject,
      topic: quiz.topic,
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      grade: getGrade(percentage),
      results,
      feedback: generateFeedback(percentage),
      completedAt: new Date().toISOString(),
    };
  },

  getPerformanceReport(quizHistory) {
    if (!quizHistory || quizHistory.length === 0) {
      return { message: 'No quiz history yet. Take a quiz to see your performance!' };
    }

    const totalQuizzes = quizHistory.length;
    const avgScore = Math.round(quizHistory.reduce((sum, q) => sum + q.percentage, 0) / totalQuizzes);

    // Performance by subject
    const bySubject = {};
    quizHistory.forEach(q => {
      if (!bySubject[q.subject]) {
        bySubject[q.subject] = { scores: [], topics: {} };
      }
      bySubject[q.subject].scores.push(q.percentage);
      if (!bySubject[q.subject].topics[q.topic]) {
        bySubject[q.subject].topics[q.topic] = [];
      }
      bySubject[q.subject].topics[q.topic].push(q.percentage);
    });

    const subjectReport = {};
    Object.entries(bySubject).forEach(([subject, data]) => {
      const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
      const topicAvgs = {};
      Object.entries(data.topics).forEach(([topic, scores]) => {
        topicAvgs[topic] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      });
      subjectReport[subject] = { average: avg, topics: topicAvgs };
    });

    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    Object.entries(subjectReport).forEach(([subject, data]) => {
      Object.entries(data.topics).forEach(([topic, avg]) => {
        if (avg >= 80) strengths.push(`${subject} — ${topic} (${avg}%)`);
        if (avg < 60) weaknesses.push(`${subject} — ${topic} (${avg}%)`);
      });
    });

    return {
      totalQuizzes,
      averageScore: avgScore,
      grade: getGrade(avgScore),
      subjectReport,
      strengths,
      weaknesses,
      recentScores: quizHistory.slice(-10).map(q => ({
        subject: q.subject,
        topic: q.topic,
        score: q.percentage,
        date: q.completedAt,
      })),
    };
  },
};

function getGrade(percentage) {
  if (percentage >= 90) return { letter: 'A', label: 'Excellent!', emoji: '🌟' };
  if (percentage >= 80) return { letter: 'B', label: 'Great Job!', emoji: '👏' };
  if (percentage >= 70) return { letter: 'C', label: 'Good Effort!', emoji: '👍' };
  if (percentage >= 60) return { letter: 'D', label: 'Keep Practicing!', emoji: '💪' };
  return { letter: 'F', label: 'Needs Improvement', emoji: '📚' };
}

function generateFeedback(percentage) {
  if (percentage >= 90) return 'Outstanding performance! You have a strong understanding of this topic. Keep it up!';
  if (percentage >= 80) return 'Great work! You\'re doing well. Review the few questions you missed to achieve mastery.';
  if (percentage >= 70) return 'Good effort! You understand the basics. Focus on the areas you got wrong and practice more.';
  if (percentage >= 60) return 'You\'re on the right track, but there\'s room for improvement. Review the explanations and try again.';
  return 'This topic needs more study. Go back to the Tutor for explanations, then retake the quiz. You\'ve got this!';
}
