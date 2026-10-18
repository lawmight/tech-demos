import type { ImportResult, SessionTurn } from "../types";

type TokenUsage = {
  input_tokens?: unknown;
  cached_input_tokens?: unknown;
  output_tokens?: unknown;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMs(record: Record<string, unknown>): number | null {
  const raw = record.timestamp ?? record.ts;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function parseCodexJsonl(text: string): ImportResult {
  const warnings: string[] = [];
  const absolute: Array<{ at: number; turn: Omit<SessionTurn, "atMs"> }> = [];
  let model = "unknown";
  let previousInput = 0;
  let previousOutput = 0;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      warnings.push(`line ${index + 1} is not JSON`);
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      warnings.push(`line ${index + 1} is not an object`);
      return;
    }
    const record = parsed as Record<string, unknown>;
    const payload = record.payload;
    if (!payload || typeof payload !== "object") return;
    const body = payload as Record<string, unknown>;
    if (record.type === "turn_context" && typeof body.model === "string") {
      model = body.model;
      return;
    }
    if (record.type !== "event_msg" || body.type !== "token_count") return;
    const info = body.info;
    if (!info || typeof info !== "object") {
      warnings.push(`line ${index + 1} token_count has no info`);
      return;
    }
    const infoRecord = info as Record<string, unknown>;
    if (typeof infoRecord.model === "string") model = infoRecord.model;
    const last = infoRecord.last_token_usage;
    const total = infoRecord.total_token_usage;
    let input: number | null = null;
    let output: number | null = null;
    if (last && typeof last === "object") {
      const usage = last as TokenUsage;
      input = numberOrNull(usage.input_tokens);
      output = numberOrNull(usage.output_tokens);
    } else if (total && typeof total === "object") {
      const usage = total as TokenUsage;
      const totalInput = numberOrNull(usage.input_tokens);
      const totalOutput = numberOrNull(usage.output_tokens);
      if (totalInput !== null && totalOutput !== null) {
        input = Math.max(0, totalInput - previousInput);
        output = Math.max(0, totalOutput - previousOutput);
        previousInput = totalInput;
        previousOutput = totalOutput;
      }
    }
    if (input === null || output === null) {
      warnings.push(`line ${index + 1} token_count is missing input or output tokens`);
      return;
    }
    if (last && total && typeof total === "object") {
      const totalInput = numberOrNull((total as TokenUsage).input_tokens);
      const totalOutput = numberOrNull((total as TokenUsage).output_tokens);
      if (totalInput !== null) previousInput = totalInput;
      if (totalOutput !== null) previousOutput = totalOutput;
    }
    const at = timestampMs(record);
    if (at === null) {
      warnings.push(`line ${index + 1} is missing a timestamp`);
      return;
    }
    absolute.push({
      at,
      turn: {
        id: `codex-${index + 1}`,
        label: `Codex turn (${model})`,
        promptTokens: input,
        outputTokens: output,
      },
    });
  });
  if (absolute.length === 0) {
    warnings.push("no Codex token_count events found");
    return { session: null, warnings };
  }
  const start = Math.min(...absolute.map((row) => row.at));
  return {
    session: {
      id: "import-codex",
      title: "Imported Codex session log",
      source: "codex",
      turns: absolute.map((row) => ({ ...row.turn, atMs: row.at - start })),
    },
    warnings,
  };
}
