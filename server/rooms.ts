import { randomBytes } from "crypto";
import type {
  GameState,
  KnowEachOtherSettings,
  Player,
  Room,
} from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import { cleanupRoom, initQuestionSession } from "./game/engine";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rooms = new Map<string, Room>();

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  if (rooms.has(code)) return generateCode();
  return code;
}

export function createRoom(host: Omit<Player, "isHost">): Room {
  const code = generateCode();
  const room: Room = {
    code,
    players: [{ ...host, isHost: true, connected: true }],
    createdAt: Date.now(),
    gameState: null,
    lobby: { selectedMode: null },
  };
  rooms.set(code, room);
  return room;
}

function ensureLobby(room: Room): Room {
  if (!room.lobby) {
    room.lobby = { selectedMode: null };
  }
  return room;
}

export function getRoom(code: string): Room | undefined {
  const room = rooms.get(code.toUpperCase());
  return room ? ensureLobby(room) : undefined;
}

export function joinRoom(
  code: string,
  player: Omit<Player, "isHost">
): { room: Room } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Комната не найдена" };
  if (room.players.length >= 2) return { error: "Комната уже полная (макс. 2 игрока)" };

  const existing = room.players.find((p) => p.id === player.id);
  if (existing) {
    existing.connected = true;
    existing.name = player.name;
    existing.avatarId = player.avatarId;
    return { room };
  }

  room.players.push({ ...player, isHost: false, connected: true });
  return { room };
}

export function setPlayerConnected(
  code: string,
  playerId: string,
  connected: boolean
): Room | null {
  const room = getRoom(code);
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  player.connected = connected;
  return room;
}

export function leaveRoom(
  code: string,
  playerId: string,
  options?: { abortGame?: boolean }
): Room | null {
  const room = getRoom(code);
  if (!room) return null;

  const shouldAbortGame = options?.abortGame !== false && room.gameState != null;

  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return room;

  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    rooms.delete(code);
    if (shouldAbortGame) cleanupRoom(code);
    return null;
  }

  if (!room.players.some((p) => p.isHost)) {
    room.players[0].isHost = true;
  }

  if (shouldAbortGame) {
    room.gameState = null;
    cleanupRoom(code);
  }

  return room;
}

export function setGameState(code: string, state: GameState | null): Room | null {
  const room = getRoom(code);
  if (!room) return null;
  room.gameState = state;
  return room;
}

export function startGame(
  code: string,
  settings: Partial<KnowEachOtherSettings> = {}
): Room | null {
  const room = getRoom(code);
  if (!room || room.players.length < 2) return null;

  const merged: KnowEachOtherSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
  };

  room.gameState = {
    mode: "know-each-other",
    settings: merged,
    status: "playing",
    round: 0,
    lives: merged.maxLives,
    currentQuestion: null,
    answers: {},
    revealed: false,
    lastResult: null,
    introSkipVotes: [],
    midSkipVotes: [],
    midInterludeDoneBy: [],
    lateSkipVotes: [],
    lateInterludeDoneBy: [],
    finaleSkipVotes: [],
    defeatSkipVotes: [],
  };

  initQuestionSession(code);

  return room;
}

export function createPlayerId(): string {
  return randomBytes(8).toString("hex");
}

export function sanitizeRoom(room: Room): Room {
  const copy = JSON.parse(JSON.stringify(room)) as Room;
  if (!copy.lobby) {
    copy.lobby = { selectedMode: null };
  }
  if (copy.gameState && !copy.gameState.introSkipVotes) {
    copy.gameState.introSkipVotes = [];
  }
  if (copy.gameState && !copy.gameState.midSkipVotes) {
    copy.gameState.midSkipVotes = [];
  }
  if (copy.gameState && !copy.gameState.midInterludeDoneBy) {
    copy.gameState.midInterludeDoneBy = [];
  }
  if (copy.gameState && !copy.gameState.lateSkipVotes) {
    copy.gameState.lateSkipVotes = [];
  }
  if (copy.gameState && !copy.gameState.lateInterludeDoneBy) {
    copy.gameState.lateInterludeDoneBy = [];
  }
  if (copy.gameState && !copy.gameState.finaleSkipVotes) {
    copy.gameState.finaleSkipVotes = [];
  }
  if (copy.gameState && !copy.gameState.defeatSkipVotes) {
    copy.gameState.defeatSkipVotes = [];
  }
  if (copy.gameState?.lastResult && !copy.gameState.lastResult.playerMessages) {
    const fallback =
      (copy.gameState.lastResult as { message?: string }).message ?? "";
    copy.gameState.lastResult.playerMessages = Object.fromEntries(
      copy.players.map((p) => [p.id, fallback])
    );
  }
  return copy;
}
