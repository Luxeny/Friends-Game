type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmProvider = "groq" | "openai" | "none";

const DEFAULT_GROQ_CHAT = "qwen/qwen3-32b";
const DEFAULT_GROQ_JUDGE = "llama-3.1-8b-instant";

function resolveProvider(): LlmProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

function apiConfig(provider: LlmProvider) {
  if (provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY!,
      model:
        process.env.GROQ_CHAT_MODEL ||
        process.env.AI_CHAT_MODEL ||
        DEFAULT_GROQ_CHAT,
    };
  }
  return {
    url: "https://api.openai.com/v1/chat/completions",
    key: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
  };
}

export function judgeModel(): string {
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_JUDGE_MODEL || DEFAULT_GROQ_JUDGE;
  }
  return process.env.AI_JUDGE_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}

function groqExtraParams(model: string): Record<string, unknown> {
  if (model.includes("qwen")) {
    return { reasoning_effort: "none" };
  }
  return {};
}

export async function llmChat(
  messages: ChatMessage[],
  opts?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const provider = resolveProvider();
  if (provider === "none") return null;

  const cfg = apiConfig(provider);
  const model = opts?.model || cfg.model;

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts?.maxTokens ?? 120,
      temperature: opts?.temperature ?? 0.85,
      messages,
      ...(provider === "groq" ? groqExtraParams(model) : {}),
    }),
  });

  if (!res.ok) {
    console.warn(`LLM ${provider} error:`, res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content?.trim() || null;
}

export function activeProvider(): LlmProvider {
  return resolveProvider();
}
