import { loadEnv } from "./loadEnv";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import type {
  GameModeId,
  KnowEachOtherSettings,
} from "../shared/types";
import {
  cleanupRoom,
  revealResults,
  startNextRound,
  submitAnswers,
} from "./game/engine";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  sanitizeRoom,
  startGame,
} from "./rooms";

loadEnv();

function allPlayersSkipped(
  votes: string[],
  players: { id: string }[]
): boolean {
  return players.length > 0 && votes.length >= players.length;
}

function markInterludeDone(
  room: NonNullable<ReturnType<typeof getRoom>>,
  field: "midInterludeDoneBy" | "lateInterludeDoneBy"
) {
  const gs = room.gameState!;
  for (const player of room.players) {
    if (!gs[field].includes(player.id)) {
      gs[field].push(player.id);
    }
  }
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "8080", 10);

const app = next({ dev });
const handle = app.getRequestHandler();
let appReady = false;

const server = createServer((req, res) => {
  const pathname = req.url?.split("?")[0] ?? "/";

  if (pathname === "/health") {
    res.writeHead(appReady ? 200 : 503, { "Content-Type": "text/plain" });
    res.end(appReady ? "ok" : "starting");
    return;
  }

  if (!appReady) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  handle(req, res);
});

const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io",
});

io.on("connection", (socket) => {
    let currentCode: string | null = null;
    let playerId: string | null = null;

    socket.on(
      "room:create",
      (
        data: { playerId: string; name: string; avatarId: string },
        cb: (res: { ok: boolean; room?: ReturnType<typeof sanitizeRoom>; error?: string }) => void
      ) => {
        playerId = data.playerId;
        const room = createRoom({
          id: data.playerId,
          name: data.name,
          avatarId: data.avatarId,
          connected: true,
        });
        currentCode = room.code;
        socket.join(room.code);
        cb({ ok: true, room: sanitizeRoom(room) });
        io.to(room.code).emit("room:update", sanitizeRoom(room));
      }
    );

    socket.on(
      "room:join",
      (
        data: { code: string; playerId: string; name: string; avatarId: string },
        cb: (res: { ok: boolean; room?: ReturnType<typeof sanitizeRoom>; error?: string }) => void
      ) => {
        const result = joinRoom(data.code, {
          id: data.playerId,
          name: data.name,
          avatarId: data.avatarId,
          connected: true,
        });
        if ("error" in result) {
          cb({ ok: false, error: result.error });
          return;
        }
        playerId = data.playerId;
        currentCode = result.room.code;
        socket.join(result.room.code);
        const snapshot = sanitizeRoom(result.room);
        cb({ ok: true, room: snapshot });
        socket.emit("room:update", snapshot);
        socket.broadcast.to(result.room.code).emit("room:update", snapshot);
      }
    );

    socket.on(
      "room:sync",
      (
        data: { code: string },
        cb: (res: { ok: boolean; room?: ReturnType<typeof sanitizeRoom>; error?: string }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room) {
          cb({ ok: false, error: "Комната не найдена" });
          return;
        }
        cb({ ok: true, room: sanitizeRoom(room) });
      }
    );

    socket.on(
      "room:select-mode",
      (
        data: { code: string; modeId: GameModeId; playerId: string },
        cb: (res: {
          ok: boolean;
          room?: ReturnType<typeof sanitizeRoom>;
          error?: string;
        }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room) return cb({ ok: false, error: "Комната не найдена" });

        const host = room.players.find((p) => p.id === data.playerId);
        if (!host?.isHost) {
          return cb({ ok: false, error: "Только хост может выбирать режим" });
        }

        room.lobby.selectedMode =
          room.lobby.selectedMode === data.modeId ? null : data.modeId;

        const snapshot = sanitizeRoom(room);
        io.to(room.code).emit("room:update", snapshot);
        cb({ ok: true, room: snapshot });
      }
    );

    socket.on(
      "game:intro-skip",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.round !== 1) {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.introSkipVotes.includes(data.playerId)) {
          room.gameState.introSkipVotes.push(data.playerId);
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:mid-skip",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.round !== 4) {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.midSkipVotes.includes(data.playerId)) {
          room.gameState.midSkipVotes.push(data.playerId);
        }

        if (allPlayersSkipped(room.gameState.midSkipVotes, room.players)) {
          markInterludeDone(room, "midInterludeDoneBy");
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:mid-complete",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.round !== 4) {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.midInterludeDoneBy.includes(data.playerId)) {
          room.gameState.midInterludeDoneBy.push(data.playerId);
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:late-skip",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.round !== 8) {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.lateSkipVotes.includes(data.playerId)) {
          room.gameState.lateSkipVotes.push(data.playerId);
        }

        if (allPlayersSkipped(room.gameState.lateSkipVotes, room.players)) {
          markInterludeDone(room, "lateInterludeDoneBy");
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:late-complete",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.round !== 8) {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.lateInterludeDoneBy.includes(data.playerId)) {
          room.gameState.lateInterludeDoneBy.push(data.playerId);
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:finale-skip",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.status !== "finished") {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.finaleSkipVotes.includes(data.playerId)) {
          room.gameState.finaleSkipVotes.push(data.playerId);
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:defeat-skip",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room?.gameState || room.gameState.status !== "finished") {
          cb?.({ ok: false });
          return;
        }

        if (!room.gameState.defeatSkipVotes.includes(data.playerId)) {
          room.gameState.defeatSkipVotes.push(data.playerId);
        }

        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb?.({ ok: true });
      }
    );

    socket.on(
      "game:start",
      async (
        data: { code: string; settings?: Partial<KnowEachOtherSettings> },
        cb: (res: { ok: boolean; error?: string }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room) return cb({ ok: false, error: "Комната не найдена" });
        const host = room.players.find((p) => p.id === playerId);
        if (!host?.isHost) return cb({ ok: false, error: "Только хост может запустить игру" });
        if (room.players.length < 2) return cb({ ok: false, error: "Нужно 2 игрока" });

        startGame(data.code, data.settings);
        await startNextRound(room);
        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb({ ok: true });
      }
    );

    socket.on(
      "game:submit",
      async (
        data: {
          code: string;
          aboutSelf: string;
          aboutFriend: string;
        },
        cb: (res: { ok: boolean }) => void
      ) => {
        const room = getRoom(data.code);
        if (!room || !playerId) return cb({ ok: false });

        await submitAnswers(
          room,
          playerId,
          data.aboutSelf,
          data.aboutFriend
        );
        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb({ ok: true });
      }
    );

    socket.on(
      "game:reveal",
      async (data: { code: string }, cb: (res: { ok: boolean }) => void) => {
        const room = getRoom(data.code);
        if (!room) return cb({ ok: false });
        await revealResults(room);
        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb({ ok: true });
      }
    );

    socket.on(
      "game:next-round",
      async (data: { code: string }, cb: (res: { ok: boolean }) => void) => {
        const room = getRoom(data.code);
        if (!room?.gameState) return cb({ ok: false });
        if (room.gameState.status === "finished") {
          room.gameState = null;
          cleanupRoom(data.code);
          io.to(data.code).emit("room:update", sanitizeRoom(room));
          return cb({ ok: true });
        }
        await startNextRound(room);
        io.to(data.code).emit("room:update", sanitizeRoom(room));
        cb({ ok: true });
      }
    );

    socket.on(
      "room:leave",
      (
        data: { code: string; playerId: string },
        cb?: (res: { ok: boolean }) => void
      ) => {
        const roomCode = data.code.toUpperCase();
        const room = getRoom(roomCode);

        if (!room) {
          cb?.({ ok: false });
          return;
        }

        if (!room.players.some((p) => p.id === data.playerId)) {
          cb?.({ ok: false });
          return;
        }

        const updated = leaveRoom(roomCode, data.playerId);
        socket.leave(roomCode);

        if (playerId === data.playerId) {
          currentCode = null;
        }

        if (updated) {
          socket.broadcast.to(roomCode).emit("room:update", sanitizeRoom(updated));
        } else {
          cleanupRoom(roomCode);
        }

        cb?.({ ok: true });
      }
    );

    socket.on("disconnect", () => {
      if (!currentCode || !playerId) return;
      const roomCode = currentCode;
      const room = getRoom(roomCode);

      if (room?.players.some((p) => p.id === playerId)) {
        const updated = leaveRoom(roomCode, playerId);
        if (updated) {
          io.to(roomCode).emit("room:update", sanitizeRoom(updated));
        } else {
          cleanupRoom(roomCode);
        }
      }

      currentCode = null;
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`> Friends' Game listening on http://0.0.0.0:${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nПорт ${port} уже занят. Закройте другой процесс или задайте другой порт:\n  set PORT=3001 && npm run dev\n`
    );
    process.exit(1);
  }
  throw err;
});

void app
  .prepare()
  .then(() => {
    appReady = true;
    console.log("> Friends' Game ready");
  })
  .catch((err) => {
    console.error("> Failed to start Friends' Game:", err);
    process.exit(1);
  });
