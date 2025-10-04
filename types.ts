export interface Alternative {
  text: string;
  isCorrect: boolean;
  key: string; // e.g., 'a', 'b', 'c'
}

export interface Question {
  questionText: string;
  alternatives: Alternative[];
  correctAnswerKey: string;
}

export enum GameState {
  Welcome,
  Playing,
  Results,
}

export interface UserAnswer {
  question: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SpeechSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
}
