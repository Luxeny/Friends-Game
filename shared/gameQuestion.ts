export function formatQuestionForPlayer(template: string, opponentName: string): string {
  return template.replace(/\{friend\}/gi, opponentName);
}

export type QuestionSegment = { text: string; highlight: boolean };

export function splitHighlightNames(
  fullText: string,
  names: string[]
): QuestionSegment[] {
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return [{ text: fullText, highlight: false }];

  const byLength = [...trimmed].sort((a, b) => b.length - a.length);
  const escaped = byLength.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = fullText.split(new RegExp(`(${escaped.join("|")})`, "i"));
  const lowerNames = new Set(byLength.map((n) => n.toLowerCase()));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: lowerNames.has(part.toLowerCase()),
    }));
}

export function splitQuestionSegments(
  fullText: string,
  highlightName: string
): QuestionSegment[] {
  if (!highlightName.trim()) return [{ text: fullText, highlight: false }];

  const escaped = highlightName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = fullText.split(new RegExp(`(${escaped})`, "i"));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: part.toLowerCase() === highlightName.toLowerCase(),
    }));
}

export type QuestionToken = { text: string; highlight: boolean };

export function questionTokens(fullText: string, highlightName: string): QuestionToken[] {
  const tokens: QuestionToken[] = [];

  for (const segment of splitQuestionSegments(fullText, highlightName)) {
    if (segment.highlight) {
      tokens.push({ text: segment.text, highlight: true });
      continue;
    }

    const words = segment.text.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      tokens.push({ text: word, highlight: false });
    }
  }

  return tokens;
}

export function isBlankAnswer(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return true;
  return t === "..." || t === "…" || t === "." || t === "-" || t === "—";
}

export type QuestionTier = "easy" | "medium" | "hard";

export function questionTier(round: number): QuestionTier {
  if (round <= 3) return "easy";
  if (round <= 7) return "medium";
  return "hard";
}
