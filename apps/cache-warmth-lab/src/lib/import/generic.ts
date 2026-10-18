import type { ImportResult, SessionTurn } from "../types";

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function parseGenericUsage(text: string): ImportResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { session: null, warnings: ["generic usage must be a JSON array"] };
  }
  if (!Array.isArray(parsed)) {
    return { session: null, warnings: ["generic usage must be a JSON array"] };
  }
  const absolute: Array<{ at: number; turn: Omit<SessionTurn, "atMs"> }> = [];
  parsed.forEach((row, index) => {
    if (!row || typeof row !== "object") {
      warnings.push(`row ${index + 1} is not an object`);
      return;
    }
    const record = row as Record<string, unknown>;
    const at = timestampMs(record.ts);
    const input = numberOrNull(record.inputTokens);
    const output = numberOrNull(record.outputTokens);
    if (at === null || input === null || output === null) {
      warnings.push(`row ${index + 1} needs ts, inputTokens, and outputTokens`);
      return;
    }
    const cached = numberOrNull(record.cachedInputTokens) ?? 0;
    const written = numberOrNull(record.cacheWriteTokens) ?? 0;
    if (cached + written > input) {
      warnings.push(`row ${index + 1} has cached plus cache-write tokens above inputTokens`);
    }
    const provider = typeof record.provider === "string" ? record.provider : null;
    const model = typeof record.model === "string" ? record.model : null;
    const label = [provider, model].filter((part) => part !== null).join(" / ");
    absolute.push({
      at,
      turn: {
        id: `generic-${index + 1}`,
        label: label.length > 0 ? label : `Usage row ${index + 1}`,
        promptTokens: input,
        outputTokens: output,
      },
    });
  });
  if (absolute.length === 0) {
    warnings.push("no generic usage rows found");
    return { session: null, warnings };
  }
  const start = Math.min(...absolute.map((row) => row.at));
  return {
    session: {
      id: "import-generic",
      title: "Imported generic usage",
      source: "generic",
      turns: absolute.map((row) => ({ ...row.turn, atMs: row.at - start })),
    },
    warnings,
  };
}
