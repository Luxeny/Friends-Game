"use client";

import { io, Socket } from "socket.io-client";
import type { GameModeId, Room } from "@/shared/types";

let socket: Socket | null = null;
let activeRoomCode: string | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: true,
    });
  }
  return socket;
}

const PLAYER_KEY = "friends-game-player";

export interface StoredPlayer {
  id: string;
  name: string;
  avatarId: string;
}

export function loadPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PLAYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

export function savePlayer(player: StoredPlayer) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function createPlayerId(): string {
  return crypto.randomUUID();
}

export type RoomUpdateCallback = (room: Room) => void;

export function subscribeRoom(cb: RoomUpdateCallback) {
  const s = getSocket();
  s.on("room:update", cb);
  return () => {
    s.off("room:update", cb);
  };
}

export function syncRoomSocket(
  code: string,
  onRoom?: (room: Room) => void
): Promise<Room | null> {
  const normalized = code.toUpperCase();
  return new Promise((resolve) => {
    getSocket().emit(
      "room:sync",
      { code: normalized },
      (res: { ok: boolean; room?: Room; error?: string }) => {
        if (res.ok && res.room) {
          onRoom?.(res.room);
          resolve(res.room);
        } else {
          resolve(null);
        }
      }
    );
  });
}

export function enterRoomSocket(
  code: string,
  player: StoredPlayer,
  onRoom?: (room: Room) => void
) {
  const normalized = code.toUpperCase();
  activeRoomCode = normalized;

  getSocket().emit(
    "room:join",
    {
      code: normalized,
      playerId: player.id,
      name: player.name,
      avatarId: player.avatarId,
    },
    (res: { ok: boolean; room?: Room; error?: string }) => {
      if (res.ok && res.room) {
        onRoom?.(res.room);
        return;
      }
      void syncRoomSocket(normalized, onRoom);
    }
  );
}

export function selectModeSocket(
  code: string,
  modeId: GameModeId,
  playerId: string,
  onRoom?: (room: Room) => void
) {
  getSocket().emit(
    "room:select-mode",
    { code: code.toUpperCase(), modeId, playerId },
    (res: { ok: boolean; room?: Room; error?: string }) => {
      if (res.ok && res.room) onRoom?.(res.room);
    }
  );
}

export function leaveRoomSocket(code: string, playerId: string): Promise<void> {
  const normalized = code.toUpperCase();

  if (activeRoomCode !== normalized) {
    return Promise.resolve();
  }

  activeRoomCode = null;

  return new Promise((resolve) => {
    const s = getSocket();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeout = setTimeout(finish, 1000);

    s.emit(
      "room:leave",
      { code: normalized, playerId },
      () => {
        clearTimeout(timeout);
        finish();
      }
    );
  });
}

export function isActiveInRoom(code: string): boolean {
  return activeRoomCode === code.toUpperCase();
}
