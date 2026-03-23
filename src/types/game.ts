import { Question } from "./question";
import { Player } from "./player";

export interface Game {
  id: string;
  code: string;
  hostId: string;
  hostWs: WebSocket;
  questions: Question[];
  players: Player[];
  currentQuestion: number;
  status: "waiting" | "in_progress" | "finished";
  // Internal state for timer and scoring
  timer?: NodeJS.Timeout;
  questionStartTime?: number;
  currentAnswers: Map<string, { answerIndex: number; timeElapsed: number }>;
}
