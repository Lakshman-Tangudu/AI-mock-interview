export interface User {
  name: string;
  email: string;
}

export interface InterviewSession {
  id: string;
  date: string;
  type: 'HR' | 'Technical';
  skills: string[];
  duration: number;
  score: number;
  readinessScore: number;
  feedback: SessionFeedback;
}

export interface SessionFeedback {
  overallScore: number;
  readinessScore: number;
  summaryMessage: string;
  strengths: string[];
  improvements: string[];
  verbal: {
    clarity: { score: number; feedback: string };
    confidence: { score: number; feedback: string };
    fluency: { score: number; feedback: string };
    fillerWords: { score: number; feedback: string };
  };
  nonVerbal: {
    eyeContact: { score: number; feedback: string };
    facialExpressions: { score: number; feedback: string };
    posture: { score: number; feedback: string };
    speakingRate?: { score: number; wpm: number; feedback: string };
    vocalTone?: { score: number; feedback: string };
    visualPresence?: { score: number; feedback: string };
    emotionalComposure?: { score: number; feedback: string };
  };
  questions: QuestionFeedback[];
}

export interface QuestionFeedback {
  questionId?: string;
  question: string;
  score: number;
  feedback: string;
  expectedKeywords: string[];
  answered: boolean;
  response?: string;
  matchedKeywords?: string[];
  coverage?: number;
  wordCount?: number;
  sentenceCount?: number;
  transcription?: {
    status?: 'completed' | 'empty' | 'failed' | 'not-configured';
    provider?: string | null;
    model?: string | null;
  } | null;
  delivery?: {
    speakingRateWPM: number;
    fillerWordCount: number;
    fillerWordDensity: number;
    estimatedDurationSeconds: number;
    toneStabilityScore?: number;
    toneSummary?: {
      averageRms: number;
      peakRms: number;
      averagePitchHz: number;
      pitchVariabilityHz: number;
      stabilityScore: number;
      sampledFrames: number;
    } | null;
    videoSummary?: {
      sampledFrames: number;
      faceDetectedFrames: number;
      centeredFaceFrames: number;
      averageFaceAreaRatio: number;
      averageMotion: number;
      presenceScore: number;
      eyeContactScore: number;
      stabilityScore: number;
      faceDetectionAvailable: boolean;
      mediapipeActive?: boolean;
      averageYawAbs?: number;
      averagePitchAbs?: number;
    } | null;
    videoPresenceScore?: number;
    visualEyeContactScore?: number;
    videoStabilityScore?: number;
    emotionSummary?: {
      status: string;
      sampledFrames: number;
      dominantEmotion: string;
      dominantRatio: number;
      emotionConfidenceAvg: number;
      composureScore: number;
      distribution: Record<string, number>;
    } | null;
    emotionalComposureScore?: number;
  };
  reference?: {
    id: string;
    category?: string | null;
    difficulty?: string | null;
    tips?: string[];
    answer?: string | null;
  } | null;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  expectedKeywords: string[];
  tips: string[];
  referenceAnswer?: string | null;
}

export interface InterviewResponse {
  questionId: string;
  response: string;
}

export interface InterviewConfig {
  type: 'HR' | 'Technical';
  skills: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeframe: number;
}

export const AVAILABLE_SKILLS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
  'SQL', 'MongoDB', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Machine Learning', 'Data Structures',
  'System Design', 'REST API', 'GraphQL', 'Git', 'CI/CD',
];

export const HR_QUESTIONS = [
  "Tell me about yourself.",
  "What are your greatest strengths?",
  "Where do you see yourself in five years?",
  "Why do you want to work here?",
  "Describe a challenging situation and how you handled it.",
  "What motivates you in a work environment?",
  "How do you handle pressure and tight deadlines?",
  "Tell me about a time you showed leadership.",
];

export const TECHNICAL_QUESTIONS: Record<string, string[]> = {
  default: [
    "Explain the difference between stack and queue data structures.",
    "What is the time complexity of binary search?",
    "Describe the concept of polymorphism in OOP.",
    "How would you optimize a slow database query?",
    "Explain RESTful API design principles.",
    "What is the difference between SQL and NoSQL databases?",
    "Describe the concept of microservices architecture.",
    "What is containerization and why is it useful?",
  ],
  React: [
    "Explain the virtual DOM in React.",
    "What are React hooks and why were they introduced?",
    "Describe the difference between state and props.",
    "How does useEffect work and when would you use it?",
    "What is context API and when should you use it?",
  ],
  Python: [
    "What are Python decorators?",
    "Explain list comprehensions in Python.",
    "What is the GIL in Python?",
    "How does Python handle memory management?",
    "Explain the difference between deep and shallow copy.",
  ],
  JavaScript: [
    "Explain closures in JavaScript.",
    "What is the event loop in JavaScript?",
    "Describe prototypal inheritance.",
    "What are Promises and async/await?",
    "Explain the difference between var, let, and const.",
  ],
};

const TIPS = [
  "Practice regularly for consistent improvement.",
  "Keep answers structured and clear.",
  "Maintain good posture while speaking.",
  "Use the STAR method for behavioral questions.",
  "Reduce filler words for better clarity.",
  "Maintain eye contact with the camera.",
  "Take a brief pause before answering complex questions.",
  "Show enthusiasm and genuine interest.",
];

export function getRandomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

export function getQuestionsForConfig(config: InterviewConfig): string[] {
  if (config.type === 'HR') {
    const count = config.difficulty === 'Easy' ? 4 : config.difficulty === 'Medium' ? 6 : 8;
    return HR_QUESTIONS.slice(0, count);
  }
  const pool: string[] = [...TECHNICAL_QUESTIONS.default];
  config.skills.forEach(skill => {
    if (TECHNICAL_QUESTIONS[skill]) {
      pool.push(...TECHNICAL_QUESTIONS[skill]);
    }
  });
  const count = config.difficulty === 'Easy' ? 4 : config.difficulty === 'Medium' ? 6 : 8;
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateMockFeedback(config: InterviewConfig, questions: string[]): SessionFeedback {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const overallScore = rand(55, 92);
  const readinessScore = rand(50, 85);

  return {
    overallScore,
    readinessScore,
    summaryMessage: overallScore >= 75
      ? "Great performance! You showed strong clarity and structured answers. Keep refining your confidence and non-verbal cues."
      : "Good attempt! Focus on improving clarity and reducing filler words. Practice regularly for better results.",
    strengths: [
      "Clear and structured explanations",
      "Good use of examples",
      "Minimal filler words",
      "Professional tone throughout",
    ].slice(0, rand(2, 4)),
    improvements: [
      "Improve eye contact with the camera",
      "Reduce pause duration between points",
      "Show more confidence in technical answers",
      "Add more specific examples",
    ].slice(0, rand(2, 4)),
    verbal: {
      clarity: { score: rand(5, 10), feedback: "Your answers were generally easy to understand." },
      confidence: { score: rand(4, 9), feedback: "Try to project more confidence in your delivery." },
      fluency: { score: rand(5, 10), feedback: "Good flow of speech with minimal hesitation." },
      fillerWords: { score: rand(4, 9), feedback: "Some filler words detected. Practice reducing them." },
    },
    nonVerbal: {
      eyeContact: { score: rand(4, 9), feedback: "Try looking directly at the camera more consistently." },
      facialExpressions: { score: rand(5, 9), feedback: "Good engagement shown through expressions." },
      posture: { score: rand(5, 10), feedback: "Maintain an upright, confident posture throughout." },
    },
    questions: questions.map(q => ({
      question: q,
      score: rand(4, 10),
      feedback: rand(0, 1) ? "Good structured answer with relevant points." : "Could benefit from more specific examples.",
      expectedKeywords: ["experience", "skills", "approach", "result", "impact"].sort(() => Math.random() - 0.5).slice(0, 3),
      answered: Math.random() > 0.1,
    })),
  };
}

const STORAGE_KEY = 'interview-coach-sessions';
const USER_KEY = 'interview-coach-user';
const SETTINGS_KEY = 'interview-coach-settings';

export function getSessions(): InterviewSession[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSession(session: InterviewSession) {
  const sessions = getSessions();
  sessions.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessionById(id: string): InterviewSession | undefined {
  return getSessions().find(s => s.id === id);
}

export function getUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export interface AppSettings {
  defaultDifficulty: 'Easy' | 'Medium' | 'Hard';
  defaultTimeframe: number;
  theme: 'light' | 'dark';
}

export function getSettings(): AppSettings {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { defaultDifficulty: 'Medium', defaultTimeframe: 15, theme: 'light' };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function addSampleData() {
  const existing = getSessions();
  if (existing.length > 0) return;

  const configs: { type: 'HR' | 'Technical'; skills: string[]; diff: 'Easy' | 'Medium' | 'Hard' }[] = [
    { type: 'HR', skills: [], diff: 'Medium' },
    { type: 'Technical', skills: ['React', 'JavaScript'], diff: 'Medium' },
    { type: 'HR', skills: [], diff: 'Easy' },
    { type: 'Technical', skills: ['Python', 'SQL'], diff: 'Hard' },
    { type: 'Technical', skills: ['Java'], diff: 'Medium' },
  ];

  const sessions: InterviewSession[] = configs.map((c, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (i * 3 + 1));
    const config: InterviewConfig = { type: c.type, skills: c.skills, difficulty: c.diff, timeframe: 15 };
    const questions = getQuestionsForConfig(config);
    const feedback = generateMockFeedback(config, questions);
    return {
      id: `session-${i + 1}`,
      date: date.toISOString(),
      type: c.type,
      skills: c.skills,
      duration: 15,
      score: feedback.overallScore,
      readinessScore: feedback.readinessScore,
      feedback,
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
