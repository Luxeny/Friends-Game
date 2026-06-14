import { randomBytes, randomInt } from "crypto";
import type { Question } from "../../shared/types";
import { questionTier, type QuestionTier } from "../../shared/gameQuestion";
import {
  isDuplicateQuestionText,
  pickQuestionFromBank,
  QUESTION_BANK,
} from "../game/questionBank";
import { llmChat } from "./llmClient";
import {
  looksLikeBrokenRussian,
  RUSSIAN_NATIVE_RULES,
  stripModelArtifacts,
} from "./russian";

function parseQuestionJson(raw: string): string | null {
  const trimmed = stripModelArtifacts(raw);
  try {
    const parsed = JSON.parse(trimmed) as { question?: string };
    if (parsed.question?.trim()) return parsed.question.trim();
  } catch {
    /* try extract from markdown */
  }

  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) {
    try {
      const parsed = JSON.parse(block[1]) as { question?: string };
      if (parsed.question?.trim()) return parsed.question.trim();
    } catch {
      /* fall through */
    }
  }

  const inline = trimmed.match(/\{"question"\s*:\s*"([^"]+)"\}/);
  if (inline) return inline[1].trim();

  if (trimmed.includes("?") || trimmed.includes("？")) {
    const line = trimmed.split("\n").find((l) => l.includes("?") || l.includes("？"));
    if (line) return line.replace(/^[^:]*:\s*/, "").replace(/^["']|["']$/g, "").trim();
  }

  return null;
}

function normalizeQuestion(text: string): string {
  let q = text.replace(/\s+/g, " ").trim();
  if (!q.includes("{friend}")) return q;
  if (!q.endsWith("?") && !q.endsWith("？")) q += "?";
  return q;
}

function validateQuestion(text: string, tier: QuestionTier): boolean {
  if (text.length < 10) return false;
  if (tier === "hard" && text.length > 220) return false;
  if (tier !== "hard" && text.length > 150) return false;
  if (!text.includes("{friend}")) return false;
  if (looksLikeBrokenRussian(text)) return false;
  return true;
}

function tierExamples(tier: QuestionTier): string {
  if (tier === "easy") {
    return (
      "Темы: цвет глаз, месяц рождения, животные, еда, напитки, музыка, игры, одежда, город.\n" +
      "Примеры (не копируй дословно):\n" +
      "- Какого цвета глаза у {friend}?\n" +
      "- В каком месяце родился {friend}?\n" +
      "- Какое животное {friend} любит больше всего?\n" +
      "- Какую еду {friend} не ест никогда?"
    );
  }
  if (tier === "medium") {
    return (
      "Темы: фантазия, деньги, выбор, характер, «на подумать».\n" +
      "Примеры (не копируй дословно):\n" +
      "- Что {friend} купил бы на 1 миллион?\n" +
      "- Какой класс авантюриста {friend} выбрал бы в другом мире?\n" +
      "- Кем {friend} был бы в постапокалипсисе?\n" +
      "- На что {friend} потратил бы выигрыш в лотерею?"
    );
  }
  return (
    "Личная ситуация — чувства, конфликт, поддержка. Только близкий друг знает ответ.\n" +
    "Пример: Если {friend} узнал, что друг скрывал правду, как {friend} отреагирует?"
  );
}

const SYSTEM_PROMPT =
  "Ты Neko-01 — ведущая игры про дружбу. Придумай ОДИН уникальный вопрос про {friend}.\n" +
  "Игроки ответят о себе и угадают ответ друга. В тексте ОБЯЗАТЕЛЬНО {friend}, не подставляй имена.\n" +
  "Каждый раз новая тема — не повторяй банальные «любимый цвет» и «время года», если они уже были.\n" +
  `${RUSSIAN_NATIVE_RULES}\n` +
  'JSON: {"question": "..."}';

async function generateAiQuestion(
  round: number,
  totalRounds: number,
  previousTexts: string[],
  tier: QuestionTier,
  temperature: number
): Promise<string | null> {
  const prev =
    previousTexts.length > 0
      ? `Уже были в этой игре (не повторяй ни тему, ни формулировку):\n${previousTexts.map((t) => `- ${t}`).join("\n")}`
      : "Это новая игра — придумай свежий вопрос.";

  const reply = await llmChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Раунд ${round}/${totalRounds}. Уровень: ${tier}.\n${tierExamples(tier)}\n${prev}\n` +
          "Придумай что-то другое, чем в примерах выше.",
      },
    ],
    { maxTokens: tier === "hard" ? 260 : 180, temperature }
  );

  const text = reply ? parseQuestionJson(reply) : null;
  return text ? normalizeQuestion(text) : null;
}

async function tryGenerateQuestion(
  round: number,
  totalRounds: number,
  previousTexts: string[],
  tier: QuestionTier
): Promise<Question | null> {
  for (const temperature of [0.95, 0.8, 0.65]) {
    const text = await generateAiQuestion(
      round,
      totalRounds,
      previousTexts,
      tier,
      temperature
    );
    if (!text || !validateQuestion(text, tier)) continue;
    if (isDuplicateQuestionText(text, previousTexts)) continue;

    return {
      id: `ai-${round}-${randomBytes(4).toString("hex")}`,
      text,
      field: "self",
    };
  }
  return null;
}

export async function pickQuestionForRound(
  roomCode: string,
  round: number,
  totalRounds: number,
  usedIds: string[],
  previousTexts: string[],
  _playerNames: string[]
): Promise<Question> {
  const tier = questionTier(round);

  // ~45% — свежий вопрос от нейросети (easy/medium/hard)
  const preferAi = randomInt(0, 99) < 45;
  if (preferAi) {
    const ai = await tryGenerateQuestion(round, totalRounds, previousTexts, tier);
    if (ai) return ai;
  }

  const fromBank = pickQuestionFromBank(roomCode, round, usedIds, previousTexts);
  if (fromBank) return fromBank;

  const aiFallback = await tryGenerateQuestion(round, totalRounds, previousTexts, tier);
  if (aiFallback) return aiFallback;

  const tierPool = QUESTION_BANK.filter((q) => q.tier === tier);
  const picked = tierPool[randomInt(0, tierPool.length)];
  return { id: picked.id, text: picked.text, field: picked.field };
}
