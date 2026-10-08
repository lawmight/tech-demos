import type { ImportResult, SessionTurn } from "../types";

type Usage = {
  input_tokens?: unknown;
  output_tokens?: unknown;
  cache_creation_input_tokens?: unknown;
  cache_read_input_tokens?: unknown;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function usageFrom(record: Record<string, unknown>): Usage | null {
  const direct = record.usage;
  if (direct && typeof direct === "object") return direct as Usage;
  const message = record.message;
  if (message && typeof message === "object") {
    const nested = (message as Record<string, unknown>).usage;
    if (nested && typeof nested === "object") return nested as Usage;
  }
  return null;
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

export function parseClaudeCodeJsonl(text: string): ImportResult {
  const warnings: string[] = [];
  const absolute: Array<{ at: number; turn: Omit<SessionTurn, "atMs"> }> = [];
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
    const usage = usageFrom(record);
    if (!usage) return;
    const input = numberOrNull(usage.input_tokens);
    const created = numberOrNull(usage.cache_creation_input_tokens) ?? 0;
    const read = numberOrNull(usage.cache_read_input_tokens) ?? 0;
    const output = numberOrNull(usage.output_tokens);
    if (input === null || output === null) {
      warnings.push(`line ${index + 1} is missing input_tokens or output_tokens`);
      return;
    }
    const at = timestampMs(record);
    if (at === null) {
      warnings.push(`line ${index + 1} is missing a timestamp`);
      return;
    }
    const message = record.message;
    const model =
      message && typeof message === "object" && typeof (message as Record<string, unknown>).model === "string"
        ? (message as Record<string, unknown>).model
        : null;
    absolute.push({
      at,
      turn: {
        id: `claude-${index + 1}`,
        label: typeof model === "string" ? `Claude Code turn (${model})` : "Claude Code turn",
        promptTokens: input + created + read,
        outputTokens: output,
      },
    });
  });
  if (absolute.length === 0) {
    warnings.push("no Claude Code usage rows found");
    return { session: null, warnings };
  }
  const start = Math.min(...absolute.map((row) => row.at));
  return {
    session: {
      id: "import-claude-code",
      title: "Imported Claude Code JSONL",
      source: "claude-code",
      turns: absolute.map((row) => ({ ...row.turn, atMs: row.at - start })),
    },
    warnings,
  };
}
