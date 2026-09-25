import { describe, expect, test } from "bun:test";
import { parsePrompt, parseTools } from "./parse";
import { applyFindings } from "./rewrite";
import { findAll } from "./rules";
import { TWO_TOOLS_JSON, docOf, twoTools } from "./testFixtures";
import { SAMPLE_PROMPT, SAMPLE_TOOLS } from "./sample";
import { counterFor } from "./tokenizer";
import type { Doc } from "./types";

const count = counterFor("o200k_base");

function sampleDoc(): Doc {
  const tools = parseTools(SAMPLE_TOOLS, count);
  if (!tools.ok) throw new Error(tools.error);
  return { sections: parsePrompt(SAMPLE_PROMPT, count), tools: tools.value, encoding: "o200k_base" };
}

describe("applyFindings with one offloaded tool", () => {
  const doc = docOf("## Role\n\nYou help with code.", twoTools());
  const rewrite = applyFindings(doc, findAll(doc, count), count);

  test("the tools JSON keeps only the remaining tool", () => {
    const parsed = JSON.parse(rewrite.toolsJson) as { name: string }[];
    expect(parsed.map((t) => t.name)).toEqual(["read_file"]);
    expect(TWO_TOOLS_JSON).toContain("jira_create_issue");
  });

  test("the prompt ends with the pointer section", () => {
    expect(rewrite.prompt.endsWith(
      "## Tools available on demand\n\n- jira_create_issue: Create a Jira issue. (full schema on demand)",
    )).toBe(true);
    expect(rewrite.setupMessage).toBe("");
  });

  test("before and after totals for the fixture", () => {
    expect(rewrite.before).toEqual({ prompt: 8, tools: 170, setup: 0, total: 178, prefix: 178 });
    expect(rewrite.after).toEqual({ prompt: 30, tools: 69, setup: 0, total: 99, prefix: 99 });
    expect(rewrite.savings).toBeCloseTo(79 / 178, 10);
  });
});

describe("applyFindings composes section patches", () => {
  test("delete beats replace, move carries the replaced text, transforms compose", () => {
    const prompt = [
      "## Role",
      "",
      "You help.",
      "",
      "## Style",
      "",
      "IMPORTANT: You MUST be brief!",
      "Be concise and conserve tokens.",
      "Today is 2026-09-25.",
    ].join("\n");
    const doc = docOf(prompt, []);
    const findings = findAll(doc, count);
    expect(findings.map((f) => f.id).sort()).toEqual([
      "conserve-tokens-trap:s1",
      "emphasis:s1",
      "volatile-in-prefix:s1",
    ]);
    const rewrite = applyFindings(doc, findings, count);
    expect(rewrite.prompt).toBe("## Role\n\nYou help.");
    expect(rewrite.setupMessage).toBe(
      "# Setup (per-request, after the cache boundary)\n\n## Style\n\nToday is 2026-09-25.",
    );
  });

  test("a partial acceptance keeps the volatile section in the prompt and out of the prefix", () => {
    const prompt = "## Role\n\nYou help.\n\n## Environment\n\nToday is 2026-09-25.\n\n## Style\n\nPlain prose.";
    const doc = docOf(prompt, []);
    const rewrite = applyFindings(doc, [], count);
    expect(rewrite.prompt).toBe(prompt);
    expect(rewrite.before).toEqual({ prompt: 25, tools: 0, setup: 0, total: 25, prefix: 6 });
    expect(rewrite.after).toEqual({ prompt: 25, tools: 0, setup: 0, total: 25, prefix: 6 });
    expect(rewrite.savings).toBe(0);
  });
});

describe("applyFindings on the sample with everything accepted", () => {
  const doc = sampleDoc();
  const rewrite = applyFindings(doc, findAll(doc, count), count);

  test("saves at least a quarter of the static tokens", () => {
    expect(rewrite.before.total).toBe(6249);
    expect(rewrite.after.total).toBe(2363);
    expect(rewrite.savings).toBeGreaterThanOrEqual(0.25);
    expect(rewrite.savings).toBeCloseTo(0.6219, 3);
  });

  test("the re-read remainder per turn shrinks from 1626 to 290 tokens", () => {
    expect(rewrite.before.total - rewrite.before.prefix).toBe(1626);
    expect(rewrite.after.total - rewrite.after.prefix).toBe(290);
    expect(rewrite.after.setup).toBe(290);
    expect(rewrite.uncachedSavings).toBeCloseTo(1336 / 1626, 10);
  });

  test("the remaining tools are the five core tools sorted by name", () => {
    const parsed = JSON.parse(rewrite.toolsJson) as { name: string }[];
    expect(parsed.map((t) => t.name)).toEqual(["edit_file", "grep_search", "list_dir", "read_file", "run_shell"]);
  });
});
