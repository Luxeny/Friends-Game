import { randomInt } from "crypto";
import type { Question } from "../../shared/types";
import { questionTier, type QuestionTier } from "../../shared/gameQuestion";

export type BankQuestion = Question & { tier: QuestionTier };

const BY_ID = new Map<string, BankQuestion>();

function register(q: BankQuestion) {
  BY_ID.set(q.id, q);
}

/** Банк вопросов с плейсхолдером {friend} */
export const QUESTION_BANK: BankQuestion[] = [
  // --- EASY — бытовые факты, разные темы ---
  { id: "e01", tier: "easy", field: "self", text: "Какого цвета глаза у {friend}?" },
  { id: "e02", tier: "easy", field: "self", text: "В каком месяце родился {friend}?" },
  { id: "e03", tier: "easy", field: "self", text: "Какое животное {friend} любит больше всего?" },
  { id: "e04", tier: "easy", field: "self", text: "Какую еду {friend} заказывает чаще других?" },
  { id: "e05", tier: "easy", field: "self", text: "Какой напиток {friend} выбирает чаще всего?" },
  { id: "e06", tier: "easy", field: "self", text: "Какой жанр фильмов {friend} включает чаще?" },
  { id: "e07", tier: "easy", field: "self", text: "Что {friend} ест на завтрак чаще всего?" },
  { id: "e08", tier: "easy", field: "self", text: "Какой десерт {friend} не откажется съесть?" },
  { id: "e09", tier: "easy", field: "self", text: "Какой фрукт {friend} любит больше остальных?" },
  { id: "e10", tier: "easy", field: "self", text: "Какой жанр музыки {friend} слушает чаще?" },
  { id: "e11", tier: "easy", field: "self", text: "Какую игру {friend} запускает, когда скучно?" },
  { id: "e12", tier: "easy", field: "self", text: "Какой цвет одежды {friend} носит чаще?" },
  { id: "e13", tier: "easy", field: "self", text: "Какое время суток {friend} считает своим?" },
  { id: "e14", tier: "easy", field: "self", text: "Какой праздник {friend} любит больше остальных?" },
  { id: "e15", tier: "easy", field: "self", text: "Какой транспорт {friend} предпочитает в городе?" },
  { id: "e16", tier: "easy", field: "self", text: "Какой смайл {friend} ставит чаще всего?" },
  { id: "e17", tier: "easy", field: "self", text: "Какую погоду {friend} называет идеальной?" },
  { id: "e18", tier: "easy", field: "self", text: "Какой фастфуд {friend} закажет без колебаний?" },
  { id: "e19", tier: "easy", field: "self", text: "Какой суп {friend} считает лучшим?" },
  { id: "e20", tier: "easy", field: "self", text: "Какое мороженое {friend} возьмёт в киоске?" },
  { id: "e21", tier: "easy", field: "self", text: "Какой сок {friend} пьёт чаще?" },
  { id: "e22", tier: "easy", field: "self", text: "Какой шоколад {friend} возьмёт на кассе?" },
  { id: "e23", tier: "easy", field: "self", text: "Какой вид спорта {friend} скорее посмотрит?" },
  { id: "e24", tier: "easy", field: "self", text: "Какой запах {friend} назовёт приятным?" },
  { id: "e25", tier: "easy", field: "self", text: "Какой знак зодиака у {friend}?" },
  { id: "e26", tier: "easy", field: "self", text: "В каком городе {friend} родился или вырос?" },
  { id: "e27", tier: "easy", field: "self", text: "Какой цвет волос у {friend}?" },
  { id: "e28", tier: "easy", field: "self", text: "Какое число {friend} считает своим lucky?" },
  { id: "e29", tier: "easy", field: "self", text: "Какую пиццу {friend} закажет без раздумий?" },
  { id: "e30", tier: "easy", field: "self", text: "Какой чай или кофе {friend} пьёт чаще?" },
  { id: "e31", tier: "easy", field: "self", text: "Какое домашнее животное {friend} хотел бы завести?" },
  { id: "e32", tier: "easy", field: "self", text: "Какой персонаж из мультфильма напоминает {friend}?" },
  { id: "e33", tier: "easy", field: "self", text: "Какой соус {friend} добавляет к еде чаще?" },
  { id: "e34", tier: "easy", field: "self", text: "Какой сезон {friend} ждёт с нетерпением?" },
  { id: "e35", tier: "easy", field: "self", text: "Какую еду {friend} не ест никогда?" },
  { id: "e36", tier: "easy", field: "self", text: "Какой напиток {friend} закажет в баре?" },
  { id: "e37", tier: "easy", field: "self", text: "Какой бренд кроссовок {friend} носит чаще?" },
  { id: "e38", tier: "easy", field: "self", text: "Какой язык {friend} хотел бы выучить?" },
  { id: "e39", tier: "easy", field: "self", text: "Какой цветок {friend} подарил бы другу?" },
  { id: "e40", tier: "easy", field: "self", text: "Какой хлеб {friend} покупает чаще — белый или чёрный?" },

  // --- MEDIUM — на подумать, фантазия, ценности ---
  { id: "m01", tier: "medium", field: "self", text: "Что {friend} купил бы на 1 миллион рублей в первую очередь?" },
  { id: "m02", tier: "medium", field: "self", text: "Какой класс авантюриста {friend} выбрал бы в другом мире?" },
  { id: "m03", tier: "medium", field: "self", text: "Кем бы {friend} стал в параллельной фэнтези-вселенной?" },
  { id: "m04", tier: "medium", field: "self", text: "Какой класс персонажа {friend} выбрал бы в RPG?" },
  { id: "m05", tier: "medium", field: "self", text: "Какое магическое существо напоминает {friend}?" },
  { id: "m06", tier: "medium", field: "self", text: "Куда {friend} поехал бы в отпуск, если деньги не проблема?" },
  { id: "m07", tier: "medium", field: "self", text: "Какой подарок {friend} был бы рад получить?" },
  { id: "m08", tier: "medium", field: "self", text: "Как {friend} обычно проводит выходной?" },
  { id: "m09", tier: "medium", field: "self", text: "Какой супергерой {friend} выбрал бы в команду?" },
  { id: "m10", tier: "medium", field: "self", text: "Какую профессию {friend} мечтал бы попробовать?" },
  { id: "m11", tier: "medium", field: "self", text: "Что {friend} слушает, когда нужно сосредоточиться?" },
  { id: "m12", tier: "medium", field: "self", text: "Какой фильм {friend} пересмотрел бы снова?" },
  { id: "m13", tier: "medium", field: "self", text: "Какой способ {friend} выбирает, чтобы снять стресс?" },
  { id: "m14", tier: "medium", field: "self", text: "Как {friend} ведёт себя на вечеринке?" },
  { id: "m15", tier: "medium", field: "self", text: "Как {friend} обычно начинает утро?" },
  { id: "m16", tier: "medium", field: "self", text: "Какую роль {friend} взял бы в командном квесте?" },
  { id: "m17", tier: "medium", field: "self", text: "Как {friend} реагирует на критику?" },
  { id: "m18", tier: "medium", field: "self", text: "Какой подарок {friend} дарит чаще других?" },
  { id: "m19", tier: "medium", field: "self", text: "Какую еду {friend} готовит лучше всего?" },
  { id: "m20", tier: "medium", field: "self", text: "Как {friend} проводит долгий перелёт?" },
  { id: "m21", tier: "medium", field: "self", text: "В какой исторической эпохе {friend} хотел бы пожить?" },
  { id: "m22", tier: "medium", field: "self", text: "Какой навык {friend} прокачал бы в первую очередь?" },
  { id: "m23", tier: "medium", field: "self", text: "Какой мем {friend} отправляет чаще других?" },
  { id: "m24", tier: "medium", field: "self", text: "Как {friend} выбирает, кому доверить секрет?" },
  { id: "m25", tier: "medium", field: "self", text: "Кем {friend} был бы в постапокалипсисе?" },
  { id: "m26", tier: "medium", field: "self", text: "На что {friend} потратил бы выигрыш в лотерею?" },
  { id: "m27", tier: "medium", field: "self", text: "Какое оружие {friend} взял бы в подземелье?" },
  { id: "m28", tier: "medium", field: "self", text: "Какой суперзлодей {friend} тайно уважает?" },
  { id: "m29", tier: "medium", field: "self", text: "Какую суперспособность {friend} выбрал бы?" },
  { id: "m30", tier: "medium", field: "self", text: "Как {friend} поступил бы, если нашёл кошелёк с деньгами?" },
  { id: "m31", tier: "medium", field: "self", text: "Какой стиль музыки {friend} включит на вечеринке?" },
  { id: "m32", tier: "medium", field: "self", text: "Какую книгу {friend} посоветовал бы прочитать?" },
  { id: "m33", tier: "medium", field: "self", text: "Как {friend} отмечает день рождения?" },
  { id: "m34", tier: "medium", field: "self", text: "Какой жанр игр {friend} проходит до конца?" },
  { id: "m35", tier: "medium", field: "self", text: "Как {friend} ведёт себя, когда выигрывает спор?" },
  { id: "m36", tier: "medium", field: "self", text: "Какой остров {friend} выбрал бы для жизни в одиночестве?" },
  { id: "m37", tier: "medium", field: "self", text: "Какую машину {friend} мечтал бы иметь?" },
  { id: "m38", tier: "medium", field: "self", text: "Как {friend} поступил бы на необитаемом острове первым делом?" },
  { id: "m39", tier: "medium", field: "self", text: "На какой планете {friend} мечтал бы жить?" },
  { id: "m40", tier: "medium", field: "self", text: "Какой трек {friend} поставил бы на repeat?" },

  // --- HARD — личные ситуации ---
  { id: "h01", tier: "hard", field: "self", text: "У {friend} плохой день и не хочется говорить. Что {friend} сделает, чтобы справиться?" },
  { id: "h02", tier: "hard", field: "self", text: "Если {friend} обидел близкого человека, как {friend} обычно заглаживает вину?" },
  { id: "h03", tier: "hard", field: "self", text: "Когда {friend} боится провала, что {friend} говорит себе перед важным делом?" },
  { id: "h04", tier: "hard", field: "self", text: "В компании незнакомых людей {friend} чувствует себя чужим. Как {friend} это скрывает?" },
  { id: "h05", tier: "hard", field: "self", text: "Если {friend} узнал, что его обманули, что {friend} сделает в первый час?" },
  { id: "h06", tier: "hard", field: "self", text: "Когда {friend} ревнует, как {friend} это показывает — или не показывает?" },
  { id: "h07", tier: "hard", field: "self", text: "Что {friend} никогда не признает вслух, но ты можешь угадать по поведению?" },
  { id: "h08", tier: "hard", field: "self", text: "Если {friend} потерял работу или учёбу, к кому {friend} пойдёт первым?" },
  { id: "h09", tier: "hard", field: "self", text: "Когда {friend} чувствует себя ненужным, что {friend} делает, чтобы это заглушить?" },
  { id: "h10", tier: "hard", field: "self", text: "В ссоре с другом {friend} всегда прав или умеет уступать? Как именно?" },
  { id: "h11", tier: "hard", field: "self", text: "Если {friend} должен выбрать между своим комфортом и помощью другу, что {friend} выберет?" },
  { id: "h12", tier: "hard", field: "self", text: "Что {friend} боится потерять больше всего — и как это влияет на решения?" },
  { id: "h13", tier: "hard", field: "self", text: "Когда {friend} один и никто не видит, чем {friend} занимается, чтобы успокоиться?" },
  { id: "h14", tier: "hard", field: "self", text: "Если {friend} узнал неприятную правду о себе, как {friend} на это реагирует?" },
  { id: "h15", tier: "hard", field: "self", text: "В момент сильной злости {friend} что делает — кричит, молчит или уходит?" },
  { id: "h16", tier: "hard", field: "self", text: "Как {friend} ведёт себя, когда другу нужна поддержка, а у {friend} самого всё плохо?" },
  { id: "h17", tier: "hard", field: "self", text: "Если {friend} должен извиниться, но считает себя правым — как {friend} поступит?" },
  { id: "h18", tier: "hard", field: "self", text: "Что {friend} считает предательством в дружбе — даже если не говорит об этом?" },
  { id: "h19", tier: "hard", field: "self", text: "Когда {friend} чувствует, что его не понимают, что {friend} делает в ответ?" },
  { id: "h20", tier: "hard", field: "self", text: "Если {friend} узнает, что близкий друг скрывал от него важное — как {friend} отреагирует?" },
];

for (const q of QUESTION_BANK) {
  register(q);
}

type TierPools = Record<QuestionTier, string[]>;
const shuffledPools = new Map<string, TierPools>();

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tierIds(tier: QuestionTier): string[] {
  return QUESTION_BANK.filter((q) => q.tier === tier).map((q) => q.id);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function initQuestionPools(roomCode: string) {
  shuffledPools.set(roomCode, {
    easy: shuffleIds(tierIds("easy")),
    medium: shuffleIds(tierIds("medium")),
    hard: shuffleIds(tierIds("hard")),
  });
}

export function clearQuestionPools(roomCode: string) {
  shuffledPools.delete(roomCode);
}

export function pickQuestionFromBank(
  roomCode: string,
  round: number,
  usedIds: string[],
  previousTexts: string[]
): Question | null {
  const tier = questionTier(round);
  const usedTextSet = new Set(previousTexts.map(normalizeText));

  const order =
    shuffledPools.get(roomCode)?.[tier] ?? shuffleIds(tierIds(tier));

  for (const id of order) {
    if (usedIds.includes(id)) continue;
    const q = BY_ID.get(id);
    if (!q || usedTextSet.has(normalizeText(q.text))) continue;
    return { id: q.id, text: q.text, field: q.field };
  }

  const remaining = order
    .map((id) => BY_ID.get(id))
    .filter((q): q is BankQuestion => !!q && !usedIds.includes(q.id));

  if (remaining.length > 0) {
    const picked = remaining[randomInt(0, remaining.length)];
    return { id: picked.id, text: picked.text, field: picked.field };
  }

  const tierPool = QUESTION_BANK.filter((q) => q.tier === tier);
  if (tierPool.length === 0) return null;

  const picked = tierPool[randomInt(0, tierPool.length)];
  return { id: picked.id, text: picked.text, field: picked.field };
}

export function isDuplicateQuestionText(text: string, previousTexts: string[]): boolean {
  const norm = normalizeText(text);
  return previousTexts.some((t) => normalizeText(t) === norm);
}
