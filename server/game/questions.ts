import type { Question } from "../../shared/types";
import { randomInt } from "crypto";
import {
  pickQuestionFromBank,
  QUESTION_BANK,
} from "./questionBank";

export { QUESTION_BANK } from "./questionBank";

export function pickFallbackQuestion(
  roomCode: string,
  round: number,
  usedIds: string[],
  previousTexts: string[] = []
): Question {
  const fromBank = pickQuestionFromBank(roomCode, round, usedIds, previousTexts);
  if (fromBank) return fromBank;

  const tierPool = QUESTION_BANK.filter((q) => q.tier === "easy");
  const picked = tierPool[randomInt(0, tierPool.length)];
  return { id: picked.id, text: picked.text, field: picked.field };
}

export function getManipulationTier(round: number): 1 | 2 | 3 | 4 | 5 {
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  if (round <= 8) return 4;
  return 5;
}

export function getEndingMessage(lives: number, maxLives: number): string {
  const ratio = lives / maxLives;
  if (lives === 0) {
    return "Ха-ха! Вы даже не знаете друг друга. Может, это и не дружба вовсе?";
  }
  if (ratio >= 1) {
    return "Неплохо... Но я всё равно знаю, что вы скрываете друг от друга больше, чем думаете.";
  }
  if (ratio >= 0.66) {
    return "Дожили до конца. Царапины на дружбе останутся — я позаботилась об этом.";
  }
  return "Еле выжили... Дружба на волоске. Как и должно быть после такой игры.";
}

export function getFailMessage(
  wrongPlayerName: string,
  otherPlayerName: string,
  round: number
): string {
  const tier = getManipulationTier(round);
  const pools: Record<number, string[]> = {
    1: [
      `Мяу... ${wrongPlayerName}, ты промахнулся. Ничего, бывает.`,
      `${wrongPlayerName}, не угадал. Может, вы ещё не так близки?`,
    ],
    2: [
      `${wrongPlayerName} ошибся про ${otherPlayerName}. Забавно, вы же «друзья».`,
      `Раунд ${round}: ${wrongPlayerName}, ты точно знаешь ${otherPlayerName}? Сомнительно.`,
    ],
    3: [
      `${wrongPlayerName} снова мимо. ${otherPlayerName} явно думал иначе — интересно, почему ты не знал.`,
      `Мяу... ${wrongPlayerName}, ${otherPlayerName} ожидал, что его поймут. Не вышло.`,
    ],
    4: [
      `${wrongPlayerName}, ты даже не представил ${otherPlayerName} правильно. Это уже не промах — это равнодушие.`,
      `Раунд ${round}: один из вас точно не слушал другого. Угадай, кто.`,
    ],
    5: [
      `${wrongPlayerName}... Ты правда называешь ${otherPlayerName} другом? С такими ответами — это смешно.`,
      `Ха. ${wrongPlayerName} не знает ${otherPlayerName}. Может, вы просто привыкли друг к другу, а не дружите.`,
    ],
  };
  const list = pools[tier];
  return list[randomInt(0, list.length)];
}

export function getDiscordMessage(
  correctPlayerName: string,
  wrongPlayerName: string,
  round: number
): string {
  const tier = getManipulationTier(round);
  const pools: Record<number, string[]> = {
    1: [
      `${correctPlayerName}, ты угадал ${wrongPlayerName}... А он — промахнулся про тебя. Бывает.`,
      `Мяу. ${correctPlayerName}, ты знаешь ${wrongPlayerName}. Интересно, знает ли он тебя.`,
    ],
    2: [
      `${correctPlayerName}, ты попал в ${wrongPlayerName}. А вот ${wrongPlayerName} о тебе — нет. Заметил?`,
      `Ты угадал, ${correctPlayerName}. ${wrongPlayerName} — нет. Неравенство в дружбе уже видно.`,
    ],
    3: [
      `${correctPlayerName}, ты слушал ${wrongPlayerName}. Он — похоже, нет. Разные ожидания.`,
      `Мяу... ${correctPlayerName}, ты знаешь ${wrongPlayerName} лучше, чем он тебя. Это не случайность.`,
    ],
    4: [
      `${correctPlayerName}, ты попал. ${wrongPlayerName} — мимо. Может, он просто не слушал тебя все это время?`,
      `Ты угадал, ${correctPlayerName}. ${wrongPlayerName} ошибся про тебя — это уже не «мелочь».`,
    ],
    5: [
      `${correctPlayerName}... Ты знаешь ${wrongPlayerName}. А он тебя — нет. Односторонняя дружба, мяу.`,
      `${correctPlayerName}, ты угадал. ${wrongPlayerName} — нет. Кто из вас настоящий друг?`,
    ],
  };
  const list = pools[tier];
  return list[randomInt(0, list.length)];
}

export function getSuccessMessage(round: number): string {
  const tier = getManipulationTier(round);
  const pools: Record<number, string[]> = {
    1: ["Верно! Пока что вы на одной волне.", "Угадали. Начало неплохое."],
    2: [
      "Верно. Но впереди вопросы, где «думать, что знаешь» уже не поможет.",
      "Справились. Посмотрим, как долго это продлится.",
    ],
    3: [
      "Верно... Странно. Обычно к этому раунду кто-то уже ошибается.",
      "Угадали. Не расслабляйтесь — я ещё разделю вас.",
    ],
    4: [
      "Попали. Может, вы и правда близки... Или просто повезло.",
      "Верно. Но один правильный ответ не делает вас настоящими друзьями.",
    ],
    5: [
      "Невероятно. Даже я почти поверила... Почти.",
      "Угадали. Жаль — мне было интереснее смотреть, как вы друг друга подводите.",
    ],
  };
  const list = pools[tier];
  return list[randomInt(0, list.length)];
}
