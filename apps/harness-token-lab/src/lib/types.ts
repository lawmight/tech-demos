export type Encoding = "o200k_base" | "cl100k_base";

/** A tool definition as pasted by the user (OpenAI `parameters` or Anthropic `input_schema`). */
export interface ToolDef {
  name: string;
  description?: string;
  parameters?: unknown;
  input_schema?: unknown;
  /** Optional share of sessions that use this tool, 0..100. Drives offload ranking. */
  usage_pct?: number;
}

export type VolatileKind =
  | "date"
  | "time"
  | "uuid"
  | "id"
  | "env"
  | "repo-state"
  | "user"
  | "skills-list"
  | "subagents-list"
  | "rules-list";

export interface VolatileMatch {
  kind: VolatileKind;
  /** The matched text, trimmed to a short excerpt. */
  match: string;
}

export interface SectionBlock {
  kind: "section";
  id: string;
  /** Heading text without the `#` markers, or null for a leading unheaded block. */
  heading: string | null;
  /** Body text excluding the heading line. */
  body: string;
  /** Full source text (heading line + body) as pasted. */
  text: string;
  index: number;
  tokens: number;
  volatile: VolatileMatch[];
}

export interface ToolBlock {
  kind: "tool";
  id: string;
  name: string;
  description: string;
  schema: unknown;
  /** Resolved usage share 0..100; null when the user gave none. */
  usagePct: number | null;
  /** True when the name matches the core set (read, search, edit, shell, list). */
  core: boolean;
  def: ToolDef;
  /** Canonical JSON text of this tool as it will be counted. */
  text: string;
  index: number;
  tokens: number;
}

export type Block = SectionBlock | ToolBlock;

export interface Doc {
  sections: SectionBlock[];
  tools: ToolBlock[];
  encoding: Encoding;
}

export type RuleId =
  | "offload-tool"
  | "trim-description"
  | "duplicate-tool-docs"
  | "emphasis"
  | "conserve-tokens-trap"
  | "inline-example"
  | "volatile-in-prefix";

export type Patch =
  | { op: "replace-section"; blockId: string; body: string }
  | { op: "delete-section"; blockId: string }
  | { op: "move-to-setup"; blockId: string }
  | { op: "replace-tool"; blockId: string; def: ToolDef }
  | { op: "offload-tool"; blockId: string; pointer: string };

export interface Finding {
  /** Stable across recomputes for the same input: `${rule}:${blockId}`. */
  id: string;
  rule: RuleId;
  /** `save` cuts tokens, `trap` flags a quality risk, `cache` improves prefix stability. */
  effect: "save" | "trap" | "cache";
  blockId: string;
  title: string;
  detail: string;
  /** Tokens removed from the static request if the patch is applied. 0 for advisory findings. */
  tokensSaved: number;
  patch: Patch;
}

export interface Rule {
  id: RuleId;
  run(doc: Doc, count: (text: string) => number): Finding[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export type LayoutSlot = "tools" | "system" | "breakpoint" | "setup" | "conversation";

export interface LayoutRow {
  slot: LayoutSlot;
  label: string;
  /** Block ids placed in this slot. */
  blockIds: string[];
  tokens: number;
}

export interface CacheReport {
  checklist: ChecklistItem[];
  /** The request as pasted: tools, then sections in source order. */
  current: LayoutRow[];
  /** The recommended order: tools → stable system → breakpoint → setup (volatile) → breakpoint → conversation. */
  recommended: LayoutRow[];
  /** Tokens that stay byte-identical across turns under the current order. */
  stablePrefixTokens: number;
  /** Tokens that would stay byte-identical under the recommended order. */
  recommendedPrefixTokens: number;
}

export interface Counts {
  prompt: number;
  tools: number;
  setup: number;
  total: number;
  /** Cacheable prefix tokens (tools + stable system text). */
  prefix: number;
}

export interface Rewrite {
  prompt: string;
  toolsJson: string;
  setupMessage: string;
  before: Counts;
  after: Counts;
  /** (before.total - after.total) / before.total, 0..1. */
  savings: number;
  /**
   * Share of the tokens re-read uncached every turn that the rewrite removes:
   * (beforeUncached - afterUncached) / max(1, beforeUncached), where uncached = total - prefix. 0..1.
   */
  uncachedSavings: number;
}

export interface Pricing {
  /** USD per million uncached input tokens. */
  uncachedPerMtok: number;
  /** USD per million cached input tokens. */
  cachedPerMtok: number;
}

export interface Report {
  doc: Doc;
  findings: Finding[];
  cache: CacheReport;
  rewrite: Rewrite;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
