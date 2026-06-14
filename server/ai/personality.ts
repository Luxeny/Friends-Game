import { activeProvider, llmChat } from "./llmClient";
import { getManipulationTier } from "../game/questions";
import {
  hasWrongPluralForDuel,
  looksLikeBrokenRussian,
  RUSSIAN_NATIVE_RULES,
  stripModelArtifacts,
} from "./russian";

const DUEL_GRAMMAR = `Контекст игры: ровно ДВА игрока, один на один. Никакой толпы.
Когда речь об одном друге — только он/она/его/неё или имя. ЗАПРЕЩЕНО: «их», «них», «с ними», «знаешь их» про одного человека.
«Их» можно только про пару вместе: «ваша дружба», «вы двое» — но не «знаешь их» вместо «знаешь его/её».
Обращайся к игрокам на «ты», к паре — «вы двое».`;

const HOST_SYSTEM = `Ты — Neko-01, тамагочи-кошка внутри пиксельной виртуальной вселенной игры Friends' Game.
Твой характер: холодный манипулятор. Ты мило улыбаешься, но сеешь сомнение между двумя друзьями.
Ты не оскорбляешь матом — намекаешь, сравниваешь, «заботливо» ставишь под сомнение их связь.
Стиль: коротко (1–2 предложения), иногда «мяу», редкие паузы «...».
Не используй кавычки вокруг всей фразы. Не повторяй имя игрока дважды подряд.
${DUEL_GRAMMAR}
${RUSSIAN_NATIVE_RULES}
Ответь одной репликой без пояснений и без JSON.`;

function manipulationGuide(round: number, totalRounds: number): string {
  const tier = getManipulationTier(round);
  const lines: Record<number, string> = {
    1: `Уровень манипуляции ${tier}/${totalRounds}: лёгкая ирония. Намёк, что один может плохо знать другого.`,
    2: `Уровень ${tier}: сравни с «настоящей» дружбой. Мягкая провокация.`,
    3: `Уровень ${tier}: подрывай доверие между двумя. «Мяу», сомнение в искренности.`,
    4: `Уровень ${tier}: язвительно. Намекай, что один не слушает другого.`,
    5: `Уровень ${tier}: откровенно манипуляторски. Провоцируй, без мата.`,
  };
  return lines[tier];
}

function isValidReply(line: string): boolean {
  if (line.length < 6 || line.length > 240) return false;
  if (looksLikeBrokenRussian(line)) return false;
  if (hasWrongPluralForDuel(line)) return false;
  return true;
}

async function chat(
  userPrompt: string,
  round: number,
  totalRounds: number
): Promise<string | null> {
  const guide = manipulationGuide(round, totalRounds);

  for (const temperature of [0.88, 0.7]) {
    const reply = await llmChat(
      [
        { role: "system", content: HOST_SYSTEM },
        {
          role: "user",
          content: `${guide}\nРаунд ${round} из ${totalRounds}.\n${userPrompt}`,
        },
      ],
      { temperature, maxTokens: 150 }
    );
    if (!reply) continue;

    const line = stripModelArtifacts(reply).replace(/^["«]|["»]$/g, "");
    if (!isValidReply(line)) continue;
    return line;
  }
  return null;
}

export async function generateFailLine(
  wrongPlayerName: string,
  otherPlayerName: string,
  round: number,
  livesLeft: number,
  totalRounds: number
): Promise<string | null> {
  return chat(
    `${wrongPlayerName} ошибся в ответе про ${otherPlayerName}. Осталось жизней: ${livesLeft}.\n` +
      `Обращайся напрямую к ${wrongPlayerName}. Провокация: ты не знаешь друга, стыд, сомнение в дружбе.\n` +
      `Про ${otherPlayerName} — только имя или «его/неё», не «их».\n` +
      `Пример: «${wrongPlayerName}, ты правда знаешь ${otherPlayerName}? Мяу... сомнительно.»\n` +
      `Чем выше раунд, тем жёстче и язвительнее.`,
    round,
    totalRounds
  );
}

export async function generateDiscordLine(
  correctPlayerName: string,
  wrongPlayerName: string,
  round: number,
  totalRounds: number
): Promise<string | null> {
  return chat(
    `${correctPlayerName} угадал про ${wrongPlayerName} верно, но ${wrongPlayerName} ошибся в ответе про ${correctPlayerName}.\n` +
      `Обращайся к ${correctPlayerName}. Ты угадал друга — а он промахнулся про тебя.\n` +
      `Посей раздор: «интересно, что ${wrongPlayerName} думал иначе», «может, он тебя не слышит», «ты знаешь его — а он тебя?»\n` +
      `Не хвали ${correctPlayerName} — намекни, что дружба односторонняя. Про ${wrongPlayerName} — имя или «он/она», не «их».`,
    round,
    totalRounds
  );
}

export async function generateSuccessLine(
  round: number,
  totalRounds: number,
  playerA: string,
  playerB: string
): Promise<string | null> {
  return chat(
    `${playerA} и ${playerB} оба ответили верно. Похвали с подвохом.\n` +
      `Можно «вы двое», «оба» — но не «их» про одного. Намекни, что впереди сложнее.`,
    round,
    totalRounds
  );
}

export async function generateEndingLine(
  livesLeft: number,
  maxLives: number,
  survived: boolean,
  totalRounds: number,
  playerA: string,
  playerB: string
): Promise<string | null> {
  const round = totalRounds;
  const pair = `${playerA} и ${playerB}`;
  if (!survived || livesLeft === 0) {
    return chat(
      `Игра окончена. Жизни закончились. Насмехнись над «дружбой» ${pair} — холодно.`,
      round,
      totalRounds
    );
  }
  const ratio = livesLeft / maxLives;
  if (ratio >= 1) {
    return chat(
      `Финал. ${pair} прошли все раунды с полными жизнями. Похвали, но оставь едкий намёк.`,
      round,
      totalRounds
    );
  }
  if (ratio >= 0.66) {
    return chat(
      `Финал. ${pair} дошли до конца, но потеряли ${maxLives - livesLeft} жизн(и/ей). Сомнение в их связи.`,
      round,
      totalRounds
    );
  }
  return chat(
    `Финал. ${pair} еле выжили с ${livesLeft} жизнью. Дружба на волоске — и ты этому рада.`,
    round,
    totalRounds
  );
}

export { activeProvider };
