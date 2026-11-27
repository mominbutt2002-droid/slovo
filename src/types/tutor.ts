export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type PlanTier = 'free' | 'pro';

export type PracticeTab =
  | 'lessons'
  | 'chat'
  | 'quiz'
  | 'pronunciation'
  | 'listening'
  | 'errors';

export interface LessonItem {
  id: string;
  level: ProficiencyLevel;
  order: number;
  title: string;
  category: 'Грамматика' | 'Правописание' | 'Лексика' | 'Стилистика';
  durationMin: number;
  freeAccessible: boolean;
  summary: string;
  keyRule: string;
  examples: Array<{ correct: string; note: string }>;
  practicePrompt: string;
}

export interface PronunciationPhrase {
  id: string;
  level: ProficiencyLevel;
  text: string;
  stressHint: string;
  focus: string;
}

export interface TutorCorrection {
  original: string;
  corrected: string;
  rule: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  corrections?: TutorCorrection[];
  tip?: string;
  audioBase64?: string | null;
  createdAt: string;
  error?: boolean;
}

export interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizPayload {
  title: string;
  questions: QuizQuestion[];
}

export interface ListeningPayload {
  title: string;
  transcript: string;
  audioBase64: string | null;
  questions: QuizQuestion[];
}

export interface PronunciationResult {
  score: number;
  transcript: string;
  stressGuide: string;
  feedback: string;
  issues: Array<{ word: string; note: string }>;
}

export interface ErrorAnalysisResult {
  score: number;
  correctedText: string;
  summary: string;
  errors: Array<{
    category: string;
    fragment: string;
    correction: string;
    explanation: string;
  }>;
}
