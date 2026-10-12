import { currentPrefixTokens } from "./cache";
import { canonicalToolJson, canonicalToolObject, withBody } from "./parse";
import { plainBody, replaceLargeExamples, stripConserveLines } from "./rules";
import type { Counter } from "./tokenizer";
import type { Counts, Doc, Finding, Rewrite, RuleId, SectionBlock, ToolDef } from "./types";

export const POINTER_SECTION_HEADING = "## Tools available on demand";
export const SETUP_HEADING = "# Setup (per-request, after the cache boundary)";

interface SectionPlan {
  deleted: boolean;
  moved: boolean;
  /** Body transforms to re-run, in composition order. */
  transforms: Set<RuleId>;
}

interface ToolPlan {
  pointer: string | null;
  def: ToolDef;
}

const BODY_TRANSFORM_ORDER: readonly RuleId[] = ["inline-example", "conserve-tokens-trap", "emphasis"];

function applyTransform(rule: RuleId, body: string, section: SectionBlock, count: Counter): string {
  switch (rule) {
    case "inline-example":
      return replaceLargeExamples(body, section.heading, count);
    case "conserve-tokens-trap":
      return stripConserveLines(body);
    case "emphasis":
      return plainBody(body);
    case "offload-tool":
    case "trim-description":
    case "duplicate-tool-docs":
    case "volatile-in-prefix":
      return body;
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }
}

function planSections(doc: Doc, accepted: Finding[]): Map<string, SectionPlan> {
  const plans = new Map<string, SectionPlan>();
  for (const s of doc.sections) plans.set(s.id, { deleted: false, moved: false, transforms: new Set() });
  for (const f of accepted) {
    const plan = plans.get(f.blockId);
    if (!plan) continue;
    const patch = f.patch;
    switch (patch.op) {
      case "delete-section":
        plan.deleted = true;
        break;
      case "move-to-setup":
        plan.moved = true;
        break;
      case "replace-section":
        plan.transforms.add(f.rule);
        break;
      case "replace-tool":
      case "offload-tool":
        break;
      default: {
        const exhaustive: never = patch;
        return exhaustive;
      }
    }
  }
  return plans;
}

function planTools(doc: Doc, accepted: Finding[]): Map<string, ToolPlan> {
  const plans = new Map<string, ToolPlan>();
  for (const t of doc.tools) plans.set(t.id, { pointer: null, def: t.def });
  for (const f of accepted) {
    const plan = plans.get(f.blockId);
    if (!plan) continue;
    const patch = f.patch;
    switch (patch.op) {
      case "offload-tool":
        plan.pointer = patch.pointer;
        break;
      case "replace-tool":
        plan.def = patch.def;
        break;
      case "replace-section":
      case "delete-section":
      case "move-to-setup":
        break;
      default: {
        const exhaustive: never = patch;
        return exhaustive;
      }
    }
  }
  return plans;
}

function rewrittenText(section: SectionBlock, plan: SectionPlan, count: Counter): string {
  if (plan.transforms.size === 0) return section.text;
  let body = section.body;
  for (const rule of BODY_TRANSFORM_ORDER) {
    if (plan.transforms.has(rule)) body = applyTransform(rule, body, section, count);
  }
  return withBody(section, body);
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function sumCounts(texts: string[], count: Counter): number {
  return texts.reduce((acc, t) => acc + count(t), 0);
}

export function applyFindings(doc: Doc, accepted: Finding[], count: Counter): Rewrite {
  const sectionPlans = planSections(doc, accepted);
  const toolPlans = planTools(doc, accepted);

  const keptSections: string[] = [];
  const movedSections: string[] = [];
  let keptPrefixTokens = 0;
  let prefixOpen = true;
  for (const s of doc.sections) {
    const plan = sectionPlans.get(s.id);
    if (!plan || plan.deleted) continue;
    const text = rewrittenText(s, plan, count);
    if (plan.moved) {
      movedSections.push(text);
      continue;
    }
    keptSections.push(text);
    if (s.volatile.length > 0) prefixOpen = false;
    if (prefixOpen) keptPrefixTokens += count(text);
  }

  const pointers: { name: string; pointer: string }[] = [];
  const remaining: ToolDef[] = [];
  for (const t of doc.tools) {
    const plan = toolPlans.get(t.id);
    if (!plan) continue;
    if (plan.pointer !== null) pointers.push({ name: t.name, pointer: plan.pointer });
    else remaining.push(plan.def);
  }
  pointers.sort(byName);
  remaining.sort(byName);

  const promptParts = [...keptSections];
  if (pointers.length > 0) {
    const pointerSection = `${POINTER_SECTION_HEADING}\n\n${pointers.map((p) => p.pointer).join("\n")}`;
    promptParts.push(pointerSection);
    if (prefixOpen) keptPrefixTokens += count(pointerSection);
  }
  const prompt = promptParts.join("\n\n");
  const setupMessage = movedSections.length === 0 ? "" : `${SETUP_HEADING}\n\n${movedSections.join("\n\n")}`;
  const toolsJson = JSON.stringify(remaining.map(canonicalToolObject), null, 2);

  const before: Counts = {
    prompt: doc.sections.reduce((acc, s) => acc + s.tokens, 0),
    tools: doc.tools.reduce((acc, t) => acc + t.tokens, 0),
    setup: 0,
    total: 0,
    prefix: currentPrefixTokens(doc),
  };
  before.total = before.prompt + before.tools;

  const after: Counts = {
    prompt: sumCounts(promptParts, count),
    tools: sumCounts(remaining.map(canonicalToolJson), count),
    setup: setupMessage === "" ? 0 : count(setupMessage),
    total: 0,
    prefix: 0,
  };
  after.total = after.prompt + after.tools + after.setup;
  after.prefix = after.tools + keptPrefixTokens;

  const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
  const beforeUncached = before.total - before.prefix;
  const afterUncached = after.total - after.prefix;
  return {
    prompt,
    toolsJson,
    setupMessage,
    before,
    after,
    savings: before.total === 0 ? 0 : clamp01((before.total - after.total) / before.total),
    uncachedSavings: clamp01((beforeUncached - afterUncached) / Math.max(1, beforeUncached)),
  };
}
