// Tutor Agent — Explains concepts and answers student questions

const knowledgeBase = {
  Mathematics: {
    'Algebra': {
      summary: 'Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. It allows us to express relationships and solve for unknowns.',
      keyPoints: [
        'Variables represent unknown quantities (e.g., x, y)',
        'Equations express equality between two expressions',
        'Linear equations have the form ax + b = 0',
        'Quadratic equations have the form ax² + bx + c = 0',
        'The quadratic formula: x = (-b ± √(b²-4ac)) / 2a',
      ],
      examples: [
        { problem: 'Solve: 2x + 5 = 13', solution: '2x = 8, so x = 4' },
        { problem: 'Solve: x² - 5x + 6 = 0', solution: '(x-2)(x-3) = 0, so x = 2 or x = 3' },
      ],
    },
    'Calculus': {
      summary: 'Calculus is the study of continuous change, dealing with derivatives (rates of change) and integrals (accumulation of quantities).',
      keyPoints: [
        'Derivatives measure instantaneous rate of change',
        'The derivative of xⁿ is nxⁿ⁻¹ (Power Rule)',
        'Integrals compute the area under a curve',
        'The Fundamental Theorem connects derivatives and integrals',
        'Limits are the foundation of both derivatives and integrals',
      ],
      examples: [
        { problem: 'Find d/dx of 3x²', solution: 'Using Power Rule: 6x' },
        { problem: '∫2x dx', solution: 'x² + C' },
      ],
    },
    'Trigonometry': {
      summary: 'Trigonometry studies relationships between angles and sides of triangles, essential for science and engineering.',
      keyPoints: [
        'sin²θ + cos²θ = 1 (Pythagorean Identity)',
        'SOH-CAH-TOA: Sin=Opposite/Hypotenuse, Cos=Adjacent/Hypotenuse, Tan=Opposite/Adjacent',
        'Unit circle defines trig functions for all angles',
        'Radians: π radians = 180°',
        'Common angles: 30°, 45°, 60°, 90° have exact values',
      ],
      examples: [
        { problem: 'Find sin(30°)', solution: 'sin(30°) = 1/2' },
        { problem: 'If cos(θ) = 3/5, find sin(θ)', solution: 'sin(θ) = 4/5 (using Pythagorean identity)' },
      ],
    },
    'Statistics': {
      summary: 'Statistics involves collecting, analyzing, interpreting, and presenting data to understand patterns and make decisions.',
      keyPoints: [
        'Mean (average) = sum of values / count of values',
        'Median = middle value when data is sorted',
        'Mode = most frequently occurring value',
        'Standard deviation measures data spread',
        'Normal distribution is bell-shaped and symmetric',
      ],
      examples: [
        { problem: 'Find the mean of {2, 4, 6, 8, 10}', solution: 'Mean = 30/5 = 6' },
        { problem: 'Find the median of {3, 7, 1, 9, 5}', solution: 'Sorted: {1,3,5,7,9}, Median = 5' },
      ],
    },
  },
  Science: {
    'Newton\'s Laws': {
      summary: 'Newton\'s three laws of motion describe the relationship between forces and the motion of objects.',
      keyPoints: [
        '1st Law (Inertia): An object stays at rest or in motion unless acted on by a force',
        '2nd Law: Force = Mass × Acceleration (F = ma)',
        '3rd Law: Every action has an equal and opposite reaction',
        'Weight = mass × gravitational acceleration (W = mg)',
        'Friction opposes the direction of motion',
      ],
      examples: [
        { problem: 'A 5 kg object accelerates at 3 m/s². Find force.', solution: 'F = ma = 5 × 3 = 15 N' },
        { problem: 'Why does a ball eventually stop rolling?', solution: 'Friction force decelerates it (Newton\'s 1st & 2nd Laws)' },
      ],
    },
    'Cell Biology': {
      summary: 'Cell biology studies the structure, function, and behavior of cells — the fundamental unit of life.',
      keyPoints: [
        'All living things are made of cells',
        'Prokaryotic cells lack a nucleus; eukaryotic cells have one',
        'Key organelles: nucleus, mitochondria, ribosomes, cell membrane',
        'Mitochondria are the "powerhouse" (produce ATP)',
        'DNA contains genetic instructions in the nucleus',
      ],
      examples: [
        { problem: 'Difference between plant and animal cells?', solution: 'Plant cells have cell walls, chloroplasts, and large vacuoles' },
        { problem: 'What is the function of ribosomes?', solution: 'Ribosomes synthesize proteins from mRNA instructions' },
      ],
    },
    'Periodic Table': {
      summary: 'The periodic table organizes elements by atomic number and chemical properties.',
      keyPoints: [
        'Elements are arranged by increasing atomic number',
        'Columns (groups) share similar chemical properties',
        'Rows (periods) represent energy levels',
        'Metals are on the left, nonmetals on the right',
        'Noble gases (Group 18) are mostly unreactive',
      ],
      examples: [
        { problem: 'Why is Na (sodium) reactive?', solution: 'It has 1 valence electron it readily gives away' },
        { problem: 'What group does Oxygen belong to?', solution: 'Group 16 (chalcogens)' },
      ],
    },
  },
  'Computer Science': {
    'Data Structures': {
      summary: 'Data structures organize and store data efficiently for access and modification.',
      keyPoints: [
        'Arrays: fixed-size, contiguous memory, O(1) access by index',
        'Linked Lists: dynamic size, O(n) access, O(1) insert/delete at head',
        'Stacks: LIFO (Last In, First Out)',
        'Queues: FIFO (First In, First Out)',
        'Trees: hierarchical structure with nodes and edges',
        'Hash Tables: O(1) average lookup using hash functions',
      ],
      examples: [
        { problem: 'When to use array vs linked list?', solution: 'Array for random access; linked list for frequent insertions/deletions' },
        { problem: 'Stack use case?', solution: 'Function call stack, undo operations, expression evaluation' },
      ],
    },
    'Algorithms': {
      summary: 'Algorithms are step-by-step procedures for solving problems efficiently.',
      keyPoints: [
        'Big O notation measures time/space complexity',
        'Sorting: Bubble O(n²), Merge O(n log n), Quick O(n log n) avg',
        'Binary Search: O(log n) on sorted data',
        'Dynamic Programming solves overlapping subproblems',
        'Greedy algorithms make locally optimal choices',
        'BFS and DFS are fundamental graph traversal methods',
      ],
      examples: [
        { problem: 'Binary search for 7 in [1,3,5,7,9]', solution: 'Mid=5→right half→mid=7→found at index 3' },
        { problem: 'Time complexity of finding max in unsorted array?', solution: 'O(n) — must check every element' },
      ],
    },
    'OOP': {
      summary: 'Object-Oriented Programming organizes code into objects that combine data and behavior.',
      keyPoints: [
        'Class: blueprint for creating objects',
        'Encapsulation: bundling data with methods that operate on it',
        'Inheritance: creating new classes from existing ones',
        'Polymorphism: same interface, different implementations',
        'Abstraction: hiding complex implementation details',
      ],
      examples: [
        { problem: 'Real-world inheritance example?', solution: 'Vehicle→Car, Vehicle→Truck (shared properties, different specifics)' },
        { problem: 'Why use encapsulation?', solution: 'Protects data integrity, reduces coupling, easier maintenance' },
      ],
    },
  },
  Physics: {
    'Mechanics': {
      summary: 'Mechanics studies the motion of objects and the forces that cause or affect motion.',
      keyPoints: [
        'Kinematics describes motion (displacement, velocity, acceleration)',
        'v = u + at, s = ut + ½at², v² = u² + 2as',
        'Projectile motion combines horizontal and vertical components',
        'Momentum = mass × velocity (p = mv)',
        'Conservation of momentum in closed systems',
      ],
      examples: [
        { problem: 'Object dropped from 20m. Time to hit ground?', solution: 't = √(2h/g) = √(40/9.8) ≈ 2.02 s' },
        { problem: 'Two objects collide. Total momentum before?', solution: 'Equal to total momentum after (conservation)' },
      ],
    },
    'Thermodynamics': {
      summary: 'Thermodynamics studies heat, energy, and the work they perform.',
      keyPoints: [
        '0th Law: Thermal equilibrium is transitive',
        '1st Law: Energy is conserved (ΔU = Q - W)',
        '2nd Law: Entropy of an isolated system always increases',
        '3rd Law: Entropy approaches zero as temperature approaches absolute zero',
        'Specific heat capacity: Q = mcΔT',
      ],
      examples: [
        { problem: 'Heat needed to warm 2kg water by 10°C?', solution: 'Q = mcΔT = 2 × 4186 × 10 = 83,720 J' },
        { problem: 'Why can\'t you build a 100% efficient engine?', solution: '2nd Law: some energy always becomes unusable (entropy increases)' },
      ],
    },
  },
  Chemistry: {
    'Chemical Bonding': {
      summary: 'Chemical bonding explains how atoms combine to form molecules through sharing or transferring electrons.',
      keyPoints: [
        'Ionic bonds: transfer of electrons (metal + nonmetal)',
        'Covalent bonds: sharing of electrons (nonmetal + nonmetal)',
        'Metallic bonds: "sea of electrons" shared among metals',
        'Electronegativity difference determines bond type',
        'Lewis structures show electron arrangement',
      ],
      examples: [
        { problem: 'Is NaCl ionic or covalent?', solution: 'Ionic — Na transfers an electron to Cl' },
        { problem: 'Draw Lewis structure of H₂O', solution: 'O in center with 2 bonding pairs (to H) and 2 lone pairs' },
      ],
    },
    'Stoichiometry': {
      summary: 'Stoichiometry calculates the quantities of reactants and products in chemical reactions.',
      keyPoints: [
        'Balanced equations conserve mass (atoms)',
        'Mole ratio from coefficients',
        '1 mole = 6.022 × 10²³ particles (Avogadro\'s number)',
        'Molar mass = sum of atomic masses',
        'Limiting reagent determines maximum product',
      ],
      examples: [
        { problem: '2H₂ + O₂ → 2H₂O. Moles of H₂O from 4 mol H₂?', solution: '4 mol H₂O (2:2 ratio)' },
        { problem: 'Molar mass of CO₂?', solution: '12 + 2(16) = 44 g/mol' },
      ],
    },
  },
  Biology: {
    'Genetics': {
      summary: 'Genetics is the study of heredity and variation in organisms.',
      keyPoints: [
        'DNA is a double helix of nucleotides (A-T, G-C pairs)',
        'Genes are segments of DNA that code for proteins',
        'Dominant alleles mask recessive alleles',
        'Punnett squares predict offspring genotype ratios',
        'Mutations are changes in DNA sequence',
      ],
      examples: [
        { problem: 'Cross Aa × Aa. What ratio?', solution: '1 AA : 2 Aa : 1 aa (3:1 phenotype ratio if A dominant)' },
        { problem: 'Difference between genotype and phenotype?', solution: 'Genotype = genetic makeup, Phenotype = observable traits' },
      ],
    },
    'Evolution': {
      summary: 'Evolution explains how populations change over time through natural selection and genetic drift.',
      keyPoints: [
        'Natural selection: survival of the fittest',
        'Adaptation: traits that improve survival',
        'Speciation: formation of new species',
        'Evidence: fossils, DNA, homologous structures',
        'Darwin\'s finches: classic example of adaptive radiation',
      ],
      examples: [
        { problem: 'How does antibiotic resistance evolve?', solution: 'Bacteria with resistance genes survive and reproduce more' },
        { problem: 'What are homologous structures?', solution: 'Similar structures in different species from common ancestor (e.g., human arm, whale fin)' },
      ],
    },
  },
};

const API_BASE = 'http://localhost:3001/api';

export const tutorAgent = {
  name: 'Tutor Agent',
  description: 'Explains concepts in a simple, interactive way and answers student questions.',

  getSubjects() {
    return Object.keys(knowledgeBase);
  },

  getTopics(subject) {
    return knowledgeBase[subject] ? Object.keys(knowledgeBase[subject]) : [];
  },

  getExplanation(subject, topic) {
    if (knowledgeBase[subject] && knowledgeBase[subject][topic]) {
      return knowledgeBase[subject][topic];
    }
    return null;
  },

  // Real AI call via backend (Groq + RAG)
  async getChatResponseAI(message, conversationHistory = []) {
    const history = conversationHistory
      .slice(-12)
      .map(m => ({ role: m.role, content: m.text || m.content || '' }));

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory: history }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to get AI response');
    }

    return {
      text: data.answer,
      type: 'ai',
      hasContext: data.hasContext,
      sources: data.sources || [],
      model: data.model,
    };
  },

  answerQuestion(question) {
    const q = question.toLowerCase();

    for (const subject of Object.keys(knowledgeBase)) {
      for (const topic of Object.keys(knowledgeBase[subject])) {
        const data = knowledgeBase[subject][topic];
        const topicLower = topic.toLowerCase();

        if (q.includes(topicLower) || topicLower.includes(q.replace(/what is |explain |tell me about |how does |define /g, '').trim())) {
          return {
            found: true,
            subject,
            topic,
            answer: data.summary,
            keyPoints: data.keyPoints,
            examples: data.examples,
          };
        }

        for (const point of data.keyPoints) {
          const keywords = point.toLowerCase().split(/\s+/);
          const qwords = q.split(/\s+/);
          const matches = qwords.filter(w => w.length > 3 && keywords.includes(w));
          if (matches.length >= 2) {
            return {
              found: true,
              subject,
              topic,
              answer: `${data.summary}\n\nRelevant: ${point}`,
              keyPoints: data.keyPoints,
              examples: data.examples,
            };
          }
        }
      }
    }

    return {
      found: false,
      answer: generateHelpfulResponse(q),
      keyPoints: [],
      examples: [],
    };
  },

  // Fallback: hardcoded knowledge base (used when backend is offline)
  getChatResponse(message, conversationHistory = []) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const msgLower = message.toLowerCase().trim();

    if (greetings.some(g => msgLower.startsWith(g))) {
      return {
        text: "Hello! I'm your AI Tutor. I can help you understand concepts in Mathematics, Science, Computer Science, Physics, Chemistry, and Biology. What would you like to learn about?",
        type: 'greeting',
      };
    }

    if (msgLower.includes('thank')) {
      return {
        text: "You're welcome! Keep up the great work. Feel free to ask me anything else!",
        type: 'thanks',
      };
    }

    if (msgLower.includes('help') || msgLower === '?') {
      return {
        text: "I can help you with:\n📐 **Mathematics** — Algebra, Calculus, Trigonometry, Statistics\n🔬 **Science** — Newton's Laws, Cell Biology, Periodic Table\n💻 **Computer Science** — Data Structures, Algorithms, OOP\n⚡ **Physics** — Mechanics, Thermodynamics\n🧪 **Chemistry** — Chemical Bonding, Stoichiometry\n🧬 **Biology** — Genetics, Evolution\n\nJust type a topic name or ask a question!",
        type: 'help',
      };
    }

    const result = this.answerQuestion(message);
    if (result.found) {
      let text = `## ${result.topic}\n\n${result.answer}\n\n### Key Points:\n`;
      result.keyPoints.forEach(p => { text += `• ${p}\n`; });
      if (result.examples.length > 0) {
        text += '\n### Examples:\n';
        result.examples.forEach(e => {
          text += `\n**Q:** ${e.problem}\n**A:** ${e.solution}\n`;
        });
      }
      return { text, type: 'explanation', subject: result.subject, topic: result.topic };
    }

    return { text: result.answer, type: 'general' };
  },
};

function generateHelpfulResponse(question) {
  const responses = [
    "That's a great question! While I don't have a detailed explanation ready for that specific topic, I'd recommend checking your textbook or asking your instructor for more details. In the meantime, try breaking the question into smaller parts!",
    "Interesting question! I'm still expanding my knowledge base. For now, try these study strategies: 1) Look up the topic in your course materials, 2) Create a summary in your own words, 3) Come back and test yourself with the Evaluator!",
    "I appreciate your curiosity! I don't have that specific topic covered yet, but here's a tip: try explaining what you do know about it out loud — teaching helps you identify gaps in your understanding.",
    "Good question! While that's outside my current expertise, I suggest: 1) Review your lecture notes, 2) Watch educational videos on the topic, 3) Practice with related problems. Knowledge builds step by step! 📚",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
