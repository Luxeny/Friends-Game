import type { Room, RoundResult } from "../../shared/types";
import { isBlankAnswer } from "../../shared/gameQuestion";
import { pickQuestionForRound } from "../ai/generateQuestion";
import { answersMatch } from "../ai/compareAnswers";
import {
  clearQuestionPools,
  initQuestionPools,
} from "./questionBank";
import {
  generateDiscordLine,
  generateEndingLine,
  generateFailLine,
  generateSuccessLine,
} from "../ai/personality";
import {
  getDiscordMessage,
  getEndingMessage,
  getFailMessage,
  getSuccessMessage,
} from "./questions";

const usedQuestionIds = new Map<string, string[]>();
const usedQuestionTexts = new Map<string, string[]>();

export function initQuestionSession(roomCode: string) {
  usedQuestionIds.set(roomCode, []);
  usedQuestionTexts.set(roomCode, []);
  initQuestionPools(roomCode);
}

export async function startNextRound(room: Room): Promise<Room> {
  if (!room.gameState) return room;
  const gs = room.gameState;
  const usedIds = usedQuestionIds.get(room.code) || [];
  const prevTexts = usedQuestionTexts.get(room.code) || [];

  if (gs.round >= gs.settings.totalRounds) {
    gs.status = "finished";
    gs.currentQuestion = null;
    return room;
  }

  gs.round += 1;
  gs.revealed = false;
  gs.lastResult = null;
  gs.answers = {};
  gs.status = "playing";

  if (gs.round === 4) {
    gs.midSkipVotes = [];
  }
  if (gs.round === 8) {
    gs.lateSkipVotes = [];
  }

  const names = room.players.map((p) => p.name);
  gs.currentQuestion = await pickQuestionForRound(
    room.code,
    gs.round,
    gs.settings.totalRounds,
    usedIds,
    prevTexts,
    names
  );

  usedIds.push(gs.currentQuestion.id);
  usedQuestionIds.set(room.code, usedIds);
  usedQuestionTexts.set(room.code, [...prevTexts, gs.currentQuestion.text]);

  for (const p of room.players) {
    gs.answers[p.id] = { aboutSelf: "", aboutFriend: "", submitted: false };
  }

  return room;
}

export async function submitAnswers(
  room: Room,
  playerId: string,
  aboutSelf: string,
  aboutFriend: string
): Promise<Room> {
  if (!room.gameState?.currentQuestion) return room;
  const gs = room.gameState;

  if (!gs.answers[playerId]) return room;
  gs.answers[playerId] = { aboutSelf, aboutFriend, submitted: true };

  const allSubmitted = room.players.every(
    (p) => gs.answers[p.id]?.submitted
  );

  if (allSubmitted) {
    await revealResults(room);
  }

  return room;
}

export async function revealResults(room: Room): Promise<Room> {
  if (!room.gameState?.currentQuestion) return room;
  const gs = room.gameState;
  const [p1, p2] = room.players;
  if (!p1 || !p2) return room;

  const a1 = gs.answers[p1.id];
  const a2 = gs.answers[p2.id];

  const bothFullyBlank =
    isBlankAnswer(a1.aboutSelf) &&
    isBlankAnswer(a1.aboutFriend) &&
    isBlankAnswer(a2.aboutSelf) &&
    isBlankAnswer(a2.aboutFriend);

  let friend1Correct = await answersMatch(a1.aboutFriend, a2.aboutSelf);
  let friend2Correct = await answersMatch(a2.aboutFriend, a1.aboutSelf);

  if (bothFullyBlank) {
    friend1Correct = false;
    friend2Correct = false;
  }

  const p1AllCorrect = friend1Correct;
  const p2AllCorrect = friend2Correct;
  const allCorrect = p1AllCorrect && p2AllCorrect;

  const playerResults: RoundResult["playerResults"] = {
    [p1.id]: {
      selfCorrect: true,
      friendGuessCorrect: friend1Correct,
      selfExpected: a1.aboutSelf,
      friendExpected: a2.aboutSelf,
      selfAnswer: a1.aboutSelf,
      friendGuess: a1.aboutFriend,
    },
    [p2.id]: {
      selfCorrect: true,
      friendGuessCorrect: friend2Correct,
      selfExpected: a2.aboutSelf,
      friendExpected: a1.aboutSelf,
      selfAnswer: a2.aboutSelf,
      friendGuess: a2.aboutFriend,
    },
  };

  let playerMessages: Record<string, string> = {};
  let message: string | undefined;
  const totalRounds = gs.settings.totalRounds;
  const livesAfter = gs.lives - (allCorrect ? 0 : 1);

  if (allCorrect) {
    const line =
      (await generateSuccessLine(gs.round, totalRounds, p1.name, p2.name)) ||
      getSuccessMessage(gs.round);
    playerMessages = { [p1.id]: line, [p2.id]: line };
  } else {
    gs.lives -= 1;

    const p1Promise = !friend1Correct
      ? generateFailLine(
          p1.name,
          p2.name,
          gs.round,
          livesAfter,
          totalRounds
        ).then((line) => line || getFailMessage(p1.name, p2.name, gs.round))
      : generateDiscordLine(p1.name, p2.name, gs.round, totalRounds).then(
          (line) => line || getDiscordMessage(p1.name, p2.name, gs.round)
        );

    const p2Promise = !friend2Correct
      ? generateFailLine(
          p2.name,
          p1.name,
          gs.round,
          livesAfter,
          totalRounds
        ).then((line) => line || getFailMessage(p2.name, p1.name, gs.round))
      : generateDiscordLine(p2.name, p1.name, gs.round, totalRounds).then(
          (line) => line || getDiscordMessage(p2.name, p1.name, gs.round)
        );

    const [p1Line, p2Line] = await Promise.all([p1Promise, p2Promise]);
    playerMessages = { [p1.id]: p1Line, [p2.id]: p2Line };
  }

  gs.revealed = true;
  gs.status = "round-result";
  gs.lastResult = { playerResults, allCorrect, playerMessages, message };

  if (gs.lives <= 0) {
    gs.status = "finished";
    const ending =
      (await generateEndingLine(
        0,
        gs.settings.maxLives,
        false,
        gs.settings.totalRounds,
        p1.name,
        p2.name
      )) ||
      getEndingMessage(0, gs.settings.maxLives);
    message = ending;
    playerMessages = { [p1.id]: ending, [p2.id]: ending };
    gs.lastResult = { playerResults, allCorrect, playerMessages, message };
  } else if (gs.round >= gs.settings.totalRounds && allCorrect) {
    gs.status = "finished";
    const ending =
      (await generateEndingLine(
        gs.lives,
        gs.settings.maxLives,
        true,
        gs.settings.totalRounds,
        p1.name,
        p2.name
      )) ||
      getEndingMessage(gs.lives, gs.settings.maxLives);
    message = ending;
    playerMessages = { [p1.id]: ending, [p2.id]: ending };
    gs.lastResult = { playerResults, allCorrect, playerMessages, message };
  }

  return room;
}

export function cleanupRoom(code: string) {
  usedQuestionIds.delete(code);
  usedQuestionTexts.delete(code);
  clearQuestionPools(code);
}
