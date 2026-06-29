export interface Question {
  id: string;
  text: string;
  answer: 'O' | 'X';
  explanation?: string;
}

export interface Student {
  id: string;
  nickname: string;
  score: number;
  lastAnswer?: 'O' | 'X' | null;
  lastAnswerTime?: number; // ms taken to answer (for speed score or tie-breaking)
  isCorrect?: boolean | null;
}

export type GameStatus = 'lobby' | 'active' | 'reveal' | 'leaderboard' | 'gameover';

export interface Room {
  code: string;
  status: GameStatus;
  questions: Question[];
  currentQuestionIndex: number;
  students: Student[];
  timerDuration: number;
  timeLeft: number;
  timerActive: boolean;
  lastActive: number;
}
