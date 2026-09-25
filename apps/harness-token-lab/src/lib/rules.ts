import { canonicalToolJson, withBody } from "./parse";
import type { Counter } from "./tokenizer";
import type { Doc, Finding, Rule, SectionBlock, ToolBlock, ToolDef } from "./types";

export const OFFLOAD_THRESHOLD_PCT = 20;
export const TRIM_DESCRIPTION_TOKENS = 60;
export const LARGE_EXAMPLE_TOKENS = 40;
export const DUPLICATE_TOOL_MENTIONS = 3;
export const EMPHASIS_DENSITY_LIMIT = 3;

const EMPHASIS_WORD_RE = /\b(?:MUST|NEVER|ALWAYS|IMPORTANT|CRITICAL|DO NOT|DON'T)\b/;
const BOLD_RE = /\*\*[^*\n]+\*\*/;
const ALLCAPS_WORD_RE = /\b[A-Z]{4,}\b/g;
const FENCE_RE = /```[^\n]*\n[\s\S]*?```/g;
const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+)?([\s\S]*)$/;

export const CONSERVE_RE =
  /(conserve|save|fewer|minimi[sz]e|limit|reduce)\b.{0,24}\btokens?\b|\bbe (brief|concise|terse)\b|keep (your )?(responses|answers|output) short|do (less|as little as possible)/i;

const ACRONYM_ALLOWLIST = new Set([
  "JSON",
  "API",
  "URL",
  "HTML",
  "CSS",
  "SQL",
  "HTTP",
  "HTTPS",
  "UUID",
  "ID",
  "UTC",
  "OS",
  "CLI",
  "README",
  "TODO",
  "YAML",
  "TOML",
  "JWT",
  "REST",
  "GRPC",
  "UI",
  "PATH",
  "HEAD",
  "PORT",
]);

function hasShoutedWord(line: string): boolean {
  for (const m of line.matchAll(ALLCAPS_WORD_RE)) {
    if (!ACRONYM_ALLOWLIST.has(m[0])) return true;
  }
  return false;
}

export function isEmphasisLine(line: string): boolean {
  return EMPHASIS_WORD_RE.test(line) || BOLD_RE.test(line) || hasShoutedWord(line);
}

/** Lines of `body` that carry emphasis, skipping fenced code where capitals are identifiers. */
export function emphasisLines(body: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && isEmphasisLine(line)) out.push(line);
  }
  return out;
}

export function countEmphasisLines(text: string): number {
  return emphasisLines(text).length;
}

/** Ordered replacement table for turning a command into a description. */
const PLAIN_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\*\*([^*\n]+)\*\*/g, "$1"],
  [/^\s*(?:IMPORTANT|CRITICAL|NOTE)\s*:\s*/, ""],
  [/\bYou MUST always\s+/g, ""],
  [/\bYou MUST\s+/g, ""],
  [/\bYou must\s+/g, ""],
  [/\bALWAYS\s+/g, ""],
  [/\bNEVER\s+/g, "Avoid "],
  [/\bDO NOT\s+/g, "Avoid "],
  [/\bDo NOT\s+/g, "Avoid "],
  [/\bDON'T\s+/g, "Avoid "],
  [/!+\s*$/, "."],
];

export function plainDescription(line: string): string {
  const m = LIST_MARKER_RE.exec(line);
  const marker = m?.[1] ?? "";
  let rest = m?.[2] ?? line;
  for (const [re, replacement] of PLAIN_REPLACEMENTS) {
    rest = rest.replace(re, replacement);
  }
  rest = rest
    .replace(ALLCAPS_WORD_RE, (w) => (ACRONYM_ALLOWLIST.has(w) ? w : w.toLowerCase()))
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, c: string) => lead + c.toUpperCase());
  return `${marker}${rest}`;
}

export function plainBody(body: string): string {
  let inFence = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return !inFence && isEmphasisLine(line) ? plainDescription(line) : line;
    })
    .join("\n");
}

export function stripConserveLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => !CONSERVE_RE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function conserveLines(body: string): string[] {
  return body.split("\n").filter((line) => CONSERVE_RE.test(line));
}

export function examplePointer(heading: string | null): string {
  return `(Example available on request: ask for the "${heading ?? "example"}" reference.)`;
}

export function replaceLargeExamples(body: string, heading: string | null, count: Counter): string {
  return body.replace(FENCE_RE, (block) =>
    count(block) > LARGE_EXAMPLE_TOKENS ? examplePointer(heading) : block,
  );
}

export function largeExampleTokens(body: string, count: Counter): number {
  let total = 0;
  for (const m of body.matchAll(FENCE_RE)) {
    const n = count(m[0]);
    if (n > LARGE_EXAMPLE_TOKENS) total += n;
  }
  return total;
}

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+/;

export function firstSentence(text: string, maxChars: number): string {
  const cleaned = text
    .replace(FENCE_RE, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned === "") return "no description";
  const first = cleaned.split(SENTENCE_SPLIT_RE)[0] ?? cleaned;
  if (first.length <= maxChars) return first;
  return `${first.slice(0, maxChars - 3).trimEnd()}...`;
}

export function trimDescription(desc: string): string {
  const withoutFences = desc.replace(FENCE_RE, "").trim();
  const firstParagraph = withoutFences.split(/\n\s*\n/)[0] ?? "";
  const kept = firstParagraph
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t === "") return false;
      if (/^(?:\*\*)?(?:MUST|NEVER|ALWAYS|IMPORTANT|CRITICAL|DO NOT|DON'T|NOTE|Example)\b/.test(t)) {
        return false;
      }
      return true;
    })
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/!/g, ".")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = kept.split(SENTENCE_SPLIT_RE).filter((s) => s.length > 0);
  return sentences.slice(0, 2).join(" ");
}

function needsTrim(tool: ToolBlock, count: Counter): boolean {
  const d = tool.description;
  return (
    count(d) > TRIM_DESCRIPTION_TOKENS ||
    /```/.test(d) ||
    /\bExample\b/.test(d) ||
    /\be\.g\./.test(d) ||
    EMPHASIS_WORD_RE.test(d)
  );
}

function shouldOffload(tool: ToolBlock): boolean {
  return !tool.core && (tool.usagePct === null || tool.usagePct < OFFLOAD_THRESHOLD_PCT);
}

export function pointerFor(tool: ToolBlock): string {
  return `- ${tool.name}: ${firstSentence(tool.description, 90)} (full schema on demand)`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionedToolNames(section: SectionBlock, tools: ToolBlock[]): string[] {
  const body = section.body.replace(/`/g, "");
  const names: string[] = [];
  for (const tool of tools) {
    if (new RegExp(`\\b${escapeRe(tool.name)}\\b`).test(body)) names.push(tool.name);
  }
  return names;
}

export function duplicateToolSectionIds(doc: Doc): Set<string> {
  const ids = new Set<string>();
  for (const s of doc.sections) {
    if (mentionedToolNames(s, doc.tools).length >= DUPLICATE_TOOL_MENTIONS) ids.add(s.id);
  }
  return ids;
}

function label(section: SectionBlock): string {
  return section.heading === null ? "the opening block" : `"${section.heading}"`;
}

function nonNegative(n: number): number {
  return n < 0 ? 0 : n;
}

const offloadTool: Rule = {
  id: "offload-tool",
  run(doc, count) {
    const out: Finding[] = [];
    for (const tool of doc.tools) {
      if (!shouldOffload(tool)) continue;
      const pointer = pointerFor(tool);
      const usage =
        tool.usagePct === null
          ? "no usage data, not in the core set"
          : `used in ${tool.usagePct}% of sessions, not in the core set`;
      out.push({
        id: `offload-tool:${tool.id}`,
        rule: "offload-tool",
        effect: "save",
        blockId: tool.id,
        title: `Offload \`${tool.name}\` to a one-line pointer`,
        detail: `${usage}. Tools needed in under ${OFFLOAD_THRESHOLD_PCT}% of sessions leave static context; the name and a one-line pointer stay, and the full schema is loaded on demand.`,
        tokensSaved: nonNegative(tool.tokens - count(pointer)),
        patch: { op: "offload-tool", blockId: tool.id, pointer },
      });
    }
    return out;
  },
};

export function trimmedDef(def: ToolDef): ToolDef {
  return { ...def, description: trimDescription(def.description ?? "") };
}

const trimDescriptionRule: Rule = {
  id: "trim-description",
  run(doc, count) {
    const out: Finding[] = [];
    for (const tool of doc.tools) {
      if (shouldOffload(tool) || !needsTrim(tool, count)) continue;
      const def = trimmedDef(tool.def);
      const saved = count(canonicalToolJson(tool.def)) - count(canonicalToolJson(def));
      if (saved <= 0) continue;
      out.push({
        id: `trim-description:${tool.id}`,
        rule: "trim-description",
        effect: "save",
        blockId: tool.id,
        title: `Trim the description of \`${tool.name}\``,
        detail: `The description carries a usage lecture, examples, or emphasis. A capable model needs the definition: the first two plain sentences stay, the rest goes.`,
        tokensSaved: saved,
        patch: { op: "replace-tool", blockId: tool.id, def },
      });
    }
    return out;
  },
};

const duplicateToolDocs: Rule = {
  id: "duplicate-tool-docs",
  run(doc) {
    const out: Finding[] = [];
    for (const s of doc.sections) {
      const names = mentionedToolNames(s, doc.tools);
      if (names.length < DUPLICATE_TOOL_MENTIONS) continue;
      out.push({
        id: `duplicate-tool-docs:${s.id}`,
        rule: "duplicate-tool-docs",
        effect: "save",
        blockId: s.id,
        title: `Delete ${label(s)}: it repeats tool descriptions`,
        detail: `This section re-describes ${names.length} tools that already have definitions in the tool list: ${names.map((n) => `\`${n}\``).join(", ")}. The tool schema is the single source; prose copies drift and cost tokens on every request.`,
        tokensSaved: s.tokens,
        patch: { op: "delete-section", blockId: s.id },
      });
    }
    return out;
  },
};

const emphasis: Rule = {
  id: "emphasis",
  run(doc, count) {
    const duplicates = duplicateToolSectionIds(doc);
    const out: Finding[] = [];
    for (const s of doc.sections) {
      if (duplicates.has(s.id)) continue;
      const lines = emphasisLines(s.body);
      if (lines.length === 0) continue;
      const body = plainBody(s.body);
      const saved = nonNegative(s.tokens - count(withBody(s, body)));
      out.push({
        id: `emphasis:${s.id}`,
        rule: "emphasis",
        effect: "save",
        blockId: s.id,
        title: `Rewrite emphasis in ${label(s)} as plain descriptions`,
        detail: `${lines.length} line${lines.length === 1 ? "" : "s"} lean on MUST, NEVER, IMPORTANT, bold, or all caps. Capable models need definitions, not commands, so each becomes a plain statement of what happens.`,
        tokensSaved: saved,
        patch: { op: "replace-section", blockId: s.id, body },
      });
    }
    return out;
  },
};

const conserveTokensTrap: Rule = {
  id: "conserve-tokens-trap",
  run(doc, count) {
    const out: Finding[] = [];
    for (const s of doc.sections) {
      const lines = conserveLines(s.body);
      if (lines.length === 0) continue;
      const body = stripConserveLines(s.body);
      out.push({
        id: `conserve-tokens-trap:${s.id}`,
        rule: "conserve-tokens-trap",
        effect: "trap",
        blockId: s.id,
        title: `Trap: ${label(s)} asks the model to conserve tokens`,
        detail: `Quoted: "${lines[0]?.trim() ?? ""}". The source calls this a trap: asking the model to use fewer tokens or do less trades quality for length. Remove the line and cut static context instead.`,
        tokensSaved: nonNegative(s.tokens - count(withBody(s, body))),
        patch: { op: "replace-section", blockId: s.id, body },
      });
    }
    return out;
  },
};

const inlineExample: Rule = {
  id: "inline-example",
  run(doc, count) {
    const duplicates = duplicateToolSectionIds(doc);
    const out: Finding[] = [];
    for (const s of doc.sections) {
      if (duplicates.has(s.id)) continue;
      const exampleTokens = largeExampleTokens(s.body, count);
      if (exampleTokens === 0) continue;
      const body = replaceLargeExamples(s.body, s.heading, count);
      out.push({
        id: `inline-example:${s.id}`,
        rule: "inline-example",
        effect: "save",
        blockId: s.id,
        title: `Make the example in ${label(s)} available on demand`,
        detail: `A fenced example of ${exampleTokens} tokens ships on every request. Static context is for what most turns need; the example becomes discoverable when the model asks for it.`,
        tokensSaved: nonNegative(s.tokens - count(withBody(s, body))),
        patch: { op: "replace-section", blockId: s.id, body },
      });
    }
    return out;
  },
};

const volatileInPrefix: Rule = {
  id: "volatile-in-prefix",
  run(doc) {
    const out: Finding[] = [];
    for (const s of doc.sections) {
      if (s.volatile.length === 0) continue;
      const kinds = [...new Set(s.volatile.map((v) => v.kind))].join(", ");
      const excerpts = s.volatile.map((v) => `"${v.match}"`).join(", ");
      out.push({
        id: `volatile-in-prefix:${s.id}`,
        rule: "volatile-in-prefix",
        effect: "cache",
        blockId: s.id,
        title: `Move ${label(s)} after the cache boundary`,
        detail: `Per-request content (${kinds}) changes between turns and breaks the byte-identical prefix: ${excerpts}. It belongs in a user-role setup message after the breakpoint.`,
        tokensSaved: 0,
        patch: { op: "move-to-setup", blockId: s.id },
      });
    }
    return out;
  },
};

export const RULES: Rule[] = [
  offloadTool,
  trimDescriptionRule,
  duplicateToolDocs,
  emphasis,
  conserveTokensTrap,
  inlineExample,
  volatileInPrefix,
];

const EFFECT_ORDER: Record<Finding["effect"], number> = { save: 0, cache: 1, trap: 2 };

function blockOrder(id: string): [string, number] {
  return [id.slice(0, 1), Number(id.slice(1))];
}

export function compareFindings(a: Finding, b: Finding): number {
  if (a.tokensSaved !== b.tokensSaved) return b.tokensSaved - a.tokensSaved;
  if (a.effect !== b.effect) return EFFECT_ORDER[a.effect] - EFFECT_ORDER[b.effect];
  const [ap, an] = blockOrder(a.blockId);
  const [bp, bn] = blockOrder(b.blockId);
  if (ap !== bp) return ap < bp ? -1 : 1;
  return an - bn;
}

export function findAll(doc: Doc, count: Counter): Finding[] {
  return RULES.flatMap((rule) => rule.run(doc, count)).sort(compareFindings);
}
