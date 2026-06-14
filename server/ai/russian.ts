/** Общие правила для генерации естественного русского текста */
export const RUSSIAN_NATIVE_RULES = `Язык: только русский, как у носителя — не перевод с английского.
Проверяй падежи, род, число и согласование (например: «какой цвет», «какая еда», «какое время»).
Фразы должны звучать разговорно и естественно, без канцелярита и кальок.
Обращение на «ты». Без английских слов, если есть русский аналог.`;

/** Местоимение «их» про одного человека — типичная ошибка LLM в дуэли 1 на 1 */
export function hasWrongPluralForDuel(line: string): boolean {
  const bad = [
    /\bзнаешь\s+их\b/i,
    /\bзнаете\s+их\b/i,
    /\bпонимаешь\s+их\b/i,
    /\bпонимаете\s+их\b/i,
    /\bих\s+настолько\s+хорошо\b/i,
    /\bих\s+так\s+хорошо\b/i,
    /\bпро\s+них\b/i,
    /\bу\s+них\b/i,
    /\bс\s+ними\b/i,
    /\bот\s+них\b/i,
  ];
  return bad.some((re) => re.test(line));
}

export const QUESTION_STYLE_RULES = `Вопрос для игры: игрок угадывает ответ друга о себе.
В тексте ОБЯЗАТЕЛЬНО плейсхолдер {friend} — клиент подставит имя соперника.
Формат: один вопрос, заканчивается «?».
Хорошо: «Какой любимый цвет у {friend}?», «Кем бы {friend} стал в фэнтези-мире?»
Плохо: подставлять реальные имена, «Какой твой любимый цвет есть?», калька с английского.`;

export function stripModelArtifacts(text: string): string {
  return text
    .replace(/[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s"'«]+|[\s"'»]+$/g, "")
    .trim();
}

/** Грубая проверка: текст похож на кривой машинный перевод */
export function looksLikeBrokenRussian(text: string): boolean {
  const cyrillic = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  if (cyrillic < 8) return true;
  if (latin > 2 && latin > cyrillic * 0.15) return true;

  const badPatterns = [
    /\bты\s+есть\b/i,
    /\bкакой\s+твой\s+\w+\s+есть\b/i,
    /\bтвой\s+любимый\s+\w+\s+на\s+завтрак\b/i,
    /\bwhat\b/i,
    /\bfavorite\b/i,
    /\byour\b/i,
  ];
  return badPatterns.some((re) => re.test(text));
}
