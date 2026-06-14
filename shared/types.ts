export type AvatarId = string;

export interface Player {
  id: string;
  name: string;
  avatarId: AvatarId;
  isHost: boolean;
  connected: boolean;
}

export type GameModeId = "know-each-other";

export interface RoomLobby {
  selectedMode: GameModeId | null;
}

export interface Room {
  code: string;
  players: Player[];
  createdAt: number;
  gameState: GameState | null;
  lobby: RoomLobby;
}

export interface KnowEachOtherSettings {
  answerTimeSec: number;
  totalRounds: number;
  maxLives: number;
}

export interface GameState {
  mode: GameModeId;
  settings: KnowEachOtherSettings;
  status: "lobby" | "playing" | "round-result" | "finished";
  round: number;
  lives: number;
  currentQuestion: Question | null;
  answers: Record<string, RoundAnswers>;
  revealed: boolean;
  lastResult: RoundResult | null;
  /** Кто нажал «Пропустить» на интро (нужны оба игрока) */
  introSkipVotes: string[];
  /** Кто нажал «Пропустить» на перебивке после 3-го раунда */
  midSkipVotes: string[];
  /** Кто завершил перебивку после 3-го раунда (досмотрел или пропустил) */
  midInterludeDoneBy: string[];
  /** Кто нажал «Пропустить» на перебивке после 7-го раунда */
  lateSkipVotes: string[];
  /** Кто завершил перебивку после 7-го раунда */
  lateInterludeDoneBy: string[];
  /** Кто нажал «Пропустить» на финале после победы */
  finaleSkipVotes: string[];
  /** Кто нажал «Пропустить» на финале после поражения */
  defeatSkipVotes: string[];
}

export interface Question {
  id: string;
  text: string;
  field: "self" | "friend";
}

export interface RoundAnswers {
  aboutSelf: string;
  aboutFriend: string;
  submitted: boolean;
}

export interface RoundResult {
  playerResults: Record<
    string,
    {
      selfCorrect: boolean;
      friendGuessCorrect: boolean;
      selfExpected: string;
      friendExpected: string;
      selfAnswer: string;
      friendGuess: string;
    }
  >;
  allCorrect: boolean;
  /** Реплика Neko для каждого игрока (разная при ошибке одного из двух) */
  playerMessages: Record<string, string>;
  /** Общая реплика на экране финала (если задана) */
  message?: string;
}

export const DEFAULT_SETTINGS: KnowEachOtherSettings = {
  answerTimeSec: 30,
  totalRounds: 10,
  maxLives: 3,
};
