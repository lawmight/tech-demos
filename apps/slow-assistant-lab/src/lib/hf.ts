export const HF_DEFAULT_MODEL = "Qwen/Qwen3-4B-Instruct-2507";
export const HF_SYSTEM_PROMPT =
  "You are the planner inside a personal assistant harness that books dinner. Speak as the agent, in first person, present tense.";
const MAX_CHARS = 140;

export type ChatMessage = { role: "system" | "user"; content: string };
export type TurnInput = { goal: string; lastResult: string; fallback: string };
export type ChatParse = { ok: true; text: string } | { ok: false; error: string };
export type HfConfig = { enabled: false } | { enabled: true; token: string; model: string };

export function buildTurnPrompt(input: TurnInput): ChatMessage[] {
  const lastResult = input.lastResult.trim() || "(none yet)";
  return [
    { role: "system", content: HF_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Goal: ${input.goal}\nLast tool result: ${lastResult}\nDraft: ${input.fallback}\nReply with ONE short sentence saying what you do next. No preamble.`,
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseChatCompletion(json: unknown): ChatParse {
  if (isRecord(json) && "error" in json) {
    const error = json.error;
    if (typeof error === "string") return { ok: false, error };
    if (isRecord(error) && typeof error.message === "string") return { ok: false, error: error.message };
  }
  const choices = isRecord(json) && Array.isArray(json.choices) ? json.choices : [];
  const first: unknown = choices[0];
  const message = isRecord(first) ? first.message : undefined;
  const content = isRecord(message) ? message.content : undefined;
  if (typeof content !== "string") return { ok: false, error: "Unexpected chat completion shape" };

  const text = content.replace(/\s+/g, " ").trim();
  if (text.length === 0) return { ok: false, error: "Model returned an empty message" };
  return { ok: true, text: text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text };
}

export function hfConfig(env: Record<string, string | undefined>): HfConfig {
  const token = (env.HF_TOKEN?.trim() || env.HUGGINGFACE_API_KEY?.trim()) ?? "";
  if (token.length === 0) return { enabled: false };
  return { enabled: true, token, model: env.HF_MODEL?.trim() || HF_DEFAULT_MODEL };
}
