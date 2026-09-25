import type { Counter } from "./tokenizer";
import type { ParseResult, SectionBlock, ToolBlock, ToolDef } from "./types";
import { detectVolatile } from "./volatile";

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

export const CORE_TOOL_RE =
  /(^|_)(read|write|edit|search|grep|glob|list|ls|shell|bash|run|exec)(_|$)/i;

interface RawChunk {
  heading: string | null;
  lines: string[];
}

function chunkByHeadings(lines: string[]): RawChunk[] {
  const chunks: RawChunk[] = [];
  let current: RawChunk = { heading: null, lines: [] };
  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      chunks.push(current);
      current = { heading: (m[2] ?? "").trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  chunks.push(current);
  return chunks;
}

function chunkByBlankLines(lines: string[]): RawChunk[] {
  const chunks: RawChunk[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) chunks.push({ heading: null, lines: current });
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) chunks.push({ heading: null, lines: current });
  return chunks;
}

export function parsePrompt(text: string, count: Counter): SectionBlock[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const hasHeading = lines.some((l) => HEADING_RE.test(l));
  const chunks = hasHeading ? chunkByHeadings(lines) : chunkByBlankLines(lines);
  const sections: SectionBlock[] = [];
  for (const chunk of chunks) {
    const full = chunk.lines.join("\n").trim();
    if (full === "") continue;
    const bodyLines = chunk.heading === null ? chunk.lines : chunk.lines.slice(1);
    const body = bodyLines.join("\n").trim();
    const index = sections.length;
    sections.push({
      kind: "section",
      id: `s${index}`,
      heading: chunk.heading,
      body,
      text: full,
      index,
      tokens: count(full),
      volatile: detectVolatile(full),
    });
  }
  return sections;
}

/** The section's source text with its body swapped; the heading line is kept as pasted. */
export function withBody(section: SectionBlock, body: string): string {
  if (section.heading === null) return body.trim();
  const headingLine = section.text.split("\n")[0] ?? `## ${section.heading}`;
  const trimmed = body.trim();
  return trimmed === "" ? headingLine : `${headingLine}\n\n${trimmed}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractToolArray(parsed: unknown): ParseResult<unknown[]> {
  if (Array.isArray(parsed)) return { ok: true, value: parsed };
  if (isRecord(parsed) && Array.isArray(parsed.tools)) {
    return { ok: true, value: parsed.tools };
  }
  return {
    ok: false,
    error: "Expected an array of tools, or an object with a `tools` array.",
  };
}

function parseJson(json: string): ParseResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON: ${msg}` };
  }
}

function toToolDef(raw: unknown, position: number): ParseResult<ToolDef> {
  if (!isRecord(raw) || typeof raw.name !== "string" || raw.name === "") {
    return {
      ok: false,
      error: `Tool #${position + 1}: expected an array of tools with a \`name\` string.`,
    };
  }
  if (raw.description !== undefined && typeof raw.description !== "string") {
    return {
      ok: false,
      error: `Tool \`${raw.name}\`: \`description\` must be a string.`,
    };
  }
  if (raw.usage_pct !== undefined && typeof raw.usage_pct !== "number") {
    return {
      ok: false,
      error: `Tool \`${raw.name}\`: \`usage_pct\` must be a number.`,
    };
  }
  const def: ToolDef = { name: raw.name };
  if (typeof raw.description === "string") def.description = raw.description;
  if ("parameters" in raw) def.parameters = raw.parameters;
  if ("input_schema" in raw) def.input_schema = raw.input_schema;
  if (typeof raw.usage_pct === "number") def.usage_pct = raw.usage_pct;
  return { ok: true, value: def };
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function parseTools(json: string, count: Counter): ParseResult<ToolBlock[]> {
  const parsed = parseJson(json);
  if (!parsed.ok) return parsed;
  const arr = extractToolArray(parsed.value);
  if (!arr.ok) return arr;
  const tools: ToolBlock[] = [];
  for (const [index, raw] of arr.value.entries()) {
    const def = toToolDef(raw, index);
    if (!def.ok) return def;
    const text = canonicalToolJson(def.value);
    tools.push({
      kind: "tool",
      id: `t${index}`,
      name: def.value.name,
      description: def.value.description ?? "",
      schema: def.value.parameters ?? def.value.input_schema ?? null,
      usagePct: def.value.usage_pct === undefined ? null : clampPct(def.value.usage_pct),
      core: CORE_TOOL_RE.test(def.value.name),
      def: def.value,
      text,
      index,
      tokens: count(text),
    });
  }
  return { ok: true, value: tools };
}

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (isRecord(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeysDeep(v[k]);
    return out;
  }
  return v;
}

export function schemaKeyOf(def: ToolDef): "parameters" | "input_schema" | null {
  if ("parameters" in def && def.parameters !== undefined) return "parameters";
  if ("input_schema" in def && def.input_schema !== undefined) return "input_schema";
  return null;
}

export function canonicalToolObject(def: ToolDef): Record<string, unknown> {
  const out: Record<string, unknown> = { name: def.name };
  if (def.description !== undefined) out.description = def.description;
  const key = schemaKeyOf(def);
  if (key !== null) out[key] = sortKeysDeep(def[key]);
  return out;
}

export function canonicalToolJson(def: ToolDef): string {
  return JSON.stringify(canonicalToolObject(def), null, 2);
}

const CANONICAL_ORDER = ["name", "description", "parameters", "input_schema"];

export function toolKeyOrderIsCanonical(rawJson: string): boolean {
  const parsed = parseJson(rawJson);
  if (!parsed.ok) return false;
  const arr = extractToolArray(parsed.value);
  if (!arr.ok) return false;
  for (const raw of arr.value) {
    if (!isRecord(raw)) return false;
    const ranks = Object.keys(raw)
      .map((k) => CANONICAL_ORDER.indexOf(k))
      .filter((r) => r >= 0);
    for (let i = 1; i < ranks.length; i++) {
      if ((ranks[i] ?? 0) < (ranks[i - 1] ?? 0)) return false;
    }
  }
  return true;
}
