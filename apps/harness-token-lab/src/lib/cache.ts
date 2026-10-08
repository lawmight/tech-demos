import { toolKeyOrderIsCanonical } from "./parse";
import { CONSERVE_RE, EMPHASIS_DENSITY_LIMIT, countEmphasisLines } from "./rules";
import type { Counter } from "./tokenizer";
import type { CacheReport, ChecklistItem, Doc, LayoutRow, SectionBlock, ToolBlock } from "./types";

const BREAKPOINT_MARKER_RE = /^\s*(?:\[breakpoint\]|<!--\s*cache breakpoint\s*-->|---)\s*$/i;

export const RECOMMENDED_ORDER_LINE =
  "tool definitions, system instructions, [breakpoint], setup message (skills, subagents, rules, environment), [breakpoint], conversation";

function sum(blocks: ReadonlyArray<{ tokens: number }>): number {
  return blocks.reduce((acc, b) => acc + b.tokens, 0);
}

export function isStable(s: SectionBlock): boolean {
  return s.volatile.length === 0;
}

export function sortedByName(tools: ToolBlock[]): ToolBlock[] {
  return [...tools].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Tokens that stay byte-identical across turns under the pasted order: tools plus every section before the first volatile one. */
export function currentPrefixTokens(doc: Doc): number {
  let prefix = sum(doc.tools);
  for (const s of doc.sections) {
    if (!isStable(s)) break;
    prefix += s.tokens;
  }
  return prefix;
}

export function recommendedPrefixTokens(doc: Doc): number {
  return sum(doc.tools) + sum(doc.sections.filter(isStable));
}

interface CheckContext {
  doc: Doc;
  rawToolsJson: string;
  stable: SectionBlock[];
  volatile: SectionBlock[];
}

interface Check {
  id: string;
  label: string;
  run(ctx: CheckContext): { pass: boolean; detail: string };
}

function namesSorted(tools: ToolBlock[]): boolean {
  for (let i = 1; i < tools.length; i++) {
    const prev = tools[i - 1];
    const cur = tools[i];
    if (prev && cur && cur.name < prev.name) return false;
  }
  return true;
}

function firstUnsortedPair(tools: ToolBlock[]): string {
  for (let i = 1; i < tools.length; i++) {
    const prev = tools[i - 1];
    const cur = tools[i];
    if (prev && cur && cur.name < prev.name) return `\`${cur.name}\` comes after \`${prev.name}\``;
  }
  return "";
}

function hasBreakpointBetween(last: SectionBlock, first: SectionBlock): boolean {
  const tail = last.text.split("\n").at(-1) ?? "";
  const head = first.body.split("\n")[0] ?? "";
  return BREAKPOINT_MARKER_RE.test(tail) || BREAKPOINT_MARKER_RE.test(head);
}

const CHECKS: readonly Check[] = [
  {
    id: "tools-sorted",
    label: "Tools are in a deterministic (sorted) order",
    run({ doc }) {
      const pass = namesSorted(doc.tools);
      return {
        pass,
        detail: pass
          ? `${doc.tools.length} tool${doc.tools.length === 1 ? "" : "s"} listed in ascending name order.`
          : `Tool order changes the prefix bytes: ${firstUnsortedPair(doc.tools)}. Sort by name before serializing.`,
      };
    },
  },
  {
    id: "tools-canonical",
    label: "Tool JSON keys are serialized in a canonical order",
    run({ rawToolsJson }) {
      const pass = toolKeyOrderIsCanonical(rawToolsJson);
      return {
        pass,
        detail: pass
          ? "Every tool lists name, then description, then the schema."
          : "At least one tool lists its keys in a different order. Serialize name, description, then schema so the same tool always produces the same bytes.",
      };
    },
  },
  {
    id: "no-volatile-in-prefix",
    label: "No per-request content inside the system prompt",
    run({ volatile }) {
      const pass = volatile.length === 0;
      return {
        pass,
        detail: pass
          ? "No dates, ids, environment, repo state, user fields, or skill lists found."
          : `${volatile.length} section${volatile.length === 1 ? "" : "s"} carry per-request content: ${volatile
              .map((s) => (s.heading === null ? "the opening block" : `"${s.heading}"`))
              .join(", ")}. Move them into the setup message after the cache boundary.`,
      };
    },
  },
  {
    id: "volatile-after-stable",
    label: "Volatile sections come after every stable section",
    run({ stable, volatile }) {
      const lastStable = stable.at(-1)?.index ?? -1;
      const firstVolatile = volatile[0]?.index ?? Number.POSITIVE_INFINITY;
      const pass = volatile.length === 0 || firstVolatile > lastStable;
      return {
        pass,
        detail: pass
          ? "Stable text is contiguous at the top, so the cache prefix covers all of it."
          : `A volatile section (index ${firstVolatile}) sits before a stable one (index ${lastStable}); everything after it is re-read on every turn.`,
      };
    },
  },
  {
    id: "breakpoint-present",
    label: "A cache breakpoint marks the end of the stable prefix",
    run({ stable, volatile }) {
      if (volatile.length === 0) {
        return { pass: true, detail: "No volatile sections, so the prefix runs to the end of the prompt." };
      }
      const last = stable.at(-1);
      const first = volatile[0];
      const ordered = last !== undefined && first !== undefined && first.index === last.index + 1;
      const pass = ordered && hasBreakpointBetween(last, first);
      return {
        pass,
        detail: pass
          ? "Found a breakpoint marker between the last stable and first volatile section."
          : `Put a \`[breakpoint]\` line (or \`<!-- cache breakpoint -->\` or \`---\`) right after ${
              last === undefined ? "the tool definitions" : `"${last.heading ?? "the opening block"}"`
            } and before the first volatile section.`,
      };
    },
  },
  {
    id: "no-conserve-trap",
    label: "No instruction asks the model to conserve tokens",
    run({ doc }) {
      const hit = doc.sections.find((s) => CONSERVE_RE.test(s.body));
      return {
        pass: hit === undefined,
        detail:
          hit === undefined
            ? "Nothing asks for fewer tokens, brevity, or doing less."
            : `${hit.heading === null ? "The opening block" : `"${hit.heading}"`} asks the model to conserve tokens. That trades quality for length; cut static context instead.`,
      };
    },
  },
  {
    id: "emphasis-density",
    label: `Fewer than ${EMPHASIS_DENSITY_LIMIT} emphasis lines in the whole prompt`,
    run({ doc }) {
      const n = doc.sections.reduce((acc, s) => acc + countEmphasisLines(s.body), 0);
      return {
        pass: n < EMPHASIS_DENSITY_LIMIT,
        detail:
          n < EMPHASIS_DENSITY_LIMIT
            ? `${n} line${n === 1 ? "" : "s"} use MUST, NEVER, IMPORTANT, bold, or all caps.`
            : `${n} lines use MUST, NEVER, IMPORTANT, bold, or all caps. Emphasis-heavy prompts are a trap; describe what each tool does instead.`,
      };
    },
  },
];

function row(slot: LayoutRow["slot"], label: string, blocks: ReadonlyArray<{ id: string; tokens: number }>): LayoutRow {
  return { slot, label, blockIds: blocks.map((b) => b.id), tokens: sum(blocks) };
}

const BREAKPOINT_ROW: LayoutRow = { slot: "breakpoint", label: "[breakpoint]", blockIds: [], tokens: 0 };
const CONVERSATION_ROW: LayoutRow = { slot: "conversation", label: "Conversation (turns)", blockIds: [], tokens: 0 };

export function cacheReport(doc: Doc, rawToolsJson: string, _count: Counter): CacheReport {
  const stable = doc.sections.filter(isStable);
  const volatile = doc.sections.filter((s) => !isStable(s));
  const ctx: CheckContext = { doc, rawToolsJson, stable, volatile };
  const checklist: ChecklistItem[] = CHECKS.map((c) => ({ id: c.id, label: c.label, ...c.run(ctx) }));
  return {
    checklist,
    current: [
      row("tools", "Tool definitions (as pasted)", doc.tools),
      row("system", "System prompt (as pasted)", doc.sections),
      CONVERSATION_ROW,
    ],
    recommended: [
      row("tools", "Tool definitions (sorted by name)", sortedByName(doc.tools)),
      row("system", "System instructions (stable)", stable),
      BREAKPOINT_ROW,
      row("setup", "Setup message (per-request)", volatile),
      BREAKPOINT_ROW,
      CONVERSATION_ROW,
    ],
    stablePrefixTokens: currentPrefixTokens(doc),
    recommendedPrefixTokens: recommendedPrefixTokens(doc),
  };
}
