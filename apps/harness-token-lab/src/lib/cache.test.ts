import { describe, expect, test } from "bun:test";
import { cacheReport, currentPrefixTokens } from "./cache";
import { parsePrompt, parseTools } from "./parse";
import { SAMPLE_PROMPT, SAMPLE_TOOLS } from "./sample";
import { counterFor } from "./tokenizer";
import type { Doc } from "./types";

const count = counterFor("o200k_base");

function docFrom(prompt: string, toolsJson: string): Doc {
  const tools = parseTools(toolsJson, count);
  if (!tools.ok) throw new Error(tools.error);
  return { sections: parsePrompt(prompt, count), tools: tools.value, encoding: "o200k_base" };
}

const TINY_TOOLS = '[{"name":"a_tool","description":"x","parameters":{}},{"name":"b_tool","description":"y","parameters":{}}]';

describe("cacheReport on the sample", () => {
  const report = cacheReport(docFrom(SAMPLE_PROMPT, SAMPLE_TOOLS), SAMPLE_TOOLS, count);

  test("tool order, key order, and volatile placement all fail", () => {
    const byId = new Map(report.checklist.map((c) => [c.id, c.pass]));
    expect(byId.get("tools-sorted")).toBe(false);
    expect(byId.get("tools-canonical")).toBe(false);
    expect(byId.get("no-volatile-in-prefix")).toBe(false);
    expect(byId.get("volatile-after-stable")).toBe(false);
    expect(byId.get("breakpoint-present")).toBe(false);
    expect(byId.get("no-conserve-trap")).toBe(false);
    expect(byId.get("emphasis-density")).toBe(false);
  });

  test("the recommended order has six rows in the documented slots", () => {
    expect(report.recommended.map((r) => r.slot)).toEqual([
      "tools",
      "system",
      "breakpoint",
      "setup",
      "breakpoint",
      "conversation",
    ]);
    expect(report.current.map((r) => r.slot)).toEqual(["tools", "system", "conversation"]);
  });

  test("the setup row holds the five volatile sections", () => {
    expect(report.recommended[3]?.blockIds).toEqual(["s1", "s10", "s11", "s12", "s13"]);
  });

  test("prefix tokens: only the Role section sits before Environment today", () => {
    expect(report.stablePrefixTokens).toBe(4623);
    expect(report.recommendedPrefixTokens).toBe(5974);
  });
});

describe("cacheReport on a tiny stable prompt", () => {
  test("every checklist item passes", () => {
    const report = cacheReport(docFrom("## Role\n\nYou help.", TINY_TOOLS), TINY_TOOLS, count);
    expect(report.checklist.map((c) => [c.id, c.pass])).toEqual([
      ["tools-sorted", true],
      ["tools-canonical", true],
      ["no-volatile-in-prefix", true],
      ["volatile-after-stable", true],
      ["breakpoint-present", true],
      ["no-conserve-trap", true],
      ["emphasis-density", true],
    ]);
  });

  test("a breakpoint marker between stable and volatile sections passes the breakpoint check", () => {
    const prompt = "## Role\n\nYou help.\n\n[breakpoint]\n\n## Environment\n\nToday is 2026-09-25.";
    const report = cacheReport(docFrom(prompt, TINY_TOOLS), TINY_TOOLS, count);
    const byId = new Map(report.checklist.map((c) => [c.id, c.pass]));
    expect(byId.get("breakpoint-present")).toBe(true);
    expect(byId.get("volatile-after-stable")).toBe(true);
    expect(byId.get("no-volatile-in-prefix")).toBe(false);
  });

  test("a missing marker fails and says where to put it", () => {
    const prompt = "## Role\n\nYou help.\n\n## Environment\n\nToday is 2026-09-25.";
    const report = cacheReport(docFrom(prompt, TINY_TOOLS), TINY_TOOLS, count);
    const item = report.checklist.find((c) => c.id === "breakpoint-present");
    expect(item?.pass).toBe(false);
    expect(item?.detail).toBe(
      'Put a `[breakpoint]` line (or `<!-- cache breakpoint -->` or `---`) right after "Role" and before the first volatile section.',
    );
  });
});

describe("currentPrefixTokens", () => {
  test("stops at the first volatile section", () => {
    const doc = docFrom("## Role\n\nYou help.\n\n## Environment\n\nToday is 2026-09-25.\n\n## Style\n\nPlain prose.", TINY_TOOLS);
    expect(doc.tools.map((t) => t.tokens)).toEqual([22, 22]);
    expect(doc.sections.map((s) => s.tokens)).toEqual([6, 13, 6]);
    expect(currentPrefixTokens(doc)).toBe(50);
  });
});
