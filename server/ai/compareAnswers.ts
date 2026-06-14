import { activeProvider, judgeModel, llmChat } from "./llmClient";
import { isBlankAnswer } from "../../shared/gameQuestion";

const THRESHOLD = parseFloat(
  process.env.ANSWER_SIMILARITY_THRESHOLD || "0.72"
);

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function simpleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? overlap / union : 0;
}

async function llmJudgeMatch(expected: string, actual: string): Promise<boolean | null> {
  if (activeProvider() === "none") return null;

  const reply = await llmChat(
    [
      {
        role: "system",
        content:
          "Ты судья в игре про дружбу. Сравни два коротких ответа на русском. " +
          "Если они означают одно и то же по смыслу (синонимы, перефраз, та же суть) — ответь YES. " +
          "Если разный смысл — NO. Учитывай русские синонимы и разговорные формулировки. " +
          "Только одно слово: YES или NO.",
      },
      {
        role: "user",
        content: `Эталон: «${expected}»\nОтвет игрока: «${actual}»`,
      },
    ],
    { model: judgeModel(), maxTokens: 5, temperature: 0 }
  );

  if (!reply) return null;
  const word = reply.toUpperCase().replace(/[^A-ZА-Я]/g, "");
  if (word.startsWith("YES") || word === "ДА") return true;
  if (word.startsWith("NO") || word === "НЕТ") return false;
  return null;
}

async function openAiSimilarity(a: string, b: string): Promise<number> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return simpleSimilarity(a, b);

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: [a, b],
    }),
  });

  if (!res.ok) {
    console.warn("OpenAI embeddings failed, fallback to simple match");
    return simpleSimilarity(a, b);
  }

  const data = (await res.json()) as {
    data: { embedding: number[] }[];
  };
  const [ea, eb] = data.data.map((d) => d.embedding);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < ea.length; i++) {
    dot += ea[i] * eb[i];
    magA += ea[i] * ea[i];
    magB += eb[i] * eb[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function ollamaSimilarity(a: string, b: string): Promise<number> {
  const url = process.env.OLLAMA_URL || "http://localhost:11434";

  async function embed(text: string): Promise<number[]> {
    const res = await fetch(`${url}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    });
    if (!res.ok) throw new Error("Ollama unavailable");
    const data = (await res.json()) as { embedding: number[] };
    return data.embedding;
  }

  try {
    const [ea, eb] = await Promise.all([embed(a), embed(b)]);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < ea.length; i++) {
      dot += ea[i] * eb[i];
      magA += ea[i] * ea[i];
      magB += eb[i] * eb[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  } catch {
    return simpleSimilarity(a, b);
  }
}

export async function answersMatch(
  expected: string,
  actual: string
): Promise<boolean> {
  if (isBlankAnswer(expected) || isBlankAnswer(actual)) return false;
  if (!expected.trim() || !actual.trim()) return false;

  if (normalize(expected) === normalize(actual)) return true;

  const llmResult = await llmJudgeMatch(expected, actual);
  if (llmResult !== null) return llmResult;

  let similarity: number;
  if (process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    similarity = await openAiSimilarity(expected, actual);
  } else if (process.env.OLLAMA_URL) {
    similarity = await ollamaSimilarity(expected, actual);
  } else {
    similarity = simpleSimilarity(expected, actual);
  }

  return similarity >= THRESHOLD;
}
