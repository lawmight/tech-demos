import { describe, expect, test } from "bun:test";
import {
  findAll,
  firstSentence,
  plainDescription,
  replaceLargeExamples,
  stripConserveLines,
  trimDescription,
} from "./rules";
import { count, docOf, toolsOf, twoTools } from "./testFixtures";

describe("offload-tool", () => {
  test("one core tool at 90% and one integration tool at 3% yield one offload finding", () => {
    const findings = findAll(docOf("## Role\n\nYou help with code.", twoTools()), count);
    expect(findings.map((f) => f.id)).toEqual(["offload-tool:t1"]);
    expect(findings[0]?.patch).toEqual({
      op: "offload-tool",
      blockId: "t1",
      pointer: "- jira_create_issue: Create a Jira issue. (full schema on demand)",
    });
    expect(findings[0]?.tokensSaved).toBe(85);
  });

  test("a tool with no usage data and a non-core name is offloaded", () => {
    const tools = toolsOf('[{"name":"weather_lookup","description":"Get the weather for a city."}]');
    const findings = findAll(docOf("", tools), count);
    expect(findings.map((f) => [f.id, f.detail.startsWith("no usage data")])).toEqual([["offload-tool:t0", true]]);
  });
});

describe("plainDescription", () => {
  test("drops the IMPORTANT prefix, the MUST command, and the exclamation", () => {
    expect(plainDescription("IMPORTANT: You MUST always run tests!")).toBe("Run tests.");
  });

  test("turns NEVER into Avoid, strips bold, lowercases shouted words, keeps the list marker", () => {
    expect(plainDescription("- NEVER commit secrets. This is **CRITICAL**.")).toBe(
      "- Avoid commit secrets. This is critical.",
    );
  });

  test("capitalises after a sentence break when a command was removed", () => {
    expect(
      plainDescription("**Do NOT** introduce a second package manager. **ALWAYS** use the one the repository uses."),
    ).toBe("Avoid introduce a second package manager. Use the one the repository uses.");
  });

  test("keeps allowlisted acronyms", () => {
    expect(plainDescription("ALWAYS return JSON over HTTP.")).toBe("Return JSON over HTTP.");
  });
});

describe("conserve-tokens-trap", () => {
  test("flags the conserve line and patches the body without it", () => {
    const prompt = "## Style\n\nWrite plainly.\nBe concise and conserve tokens; keep answers short.\nLead with the result.";
    const findings = findAll(docOf(prompt, []), count);
    expect(findings.map((f) => [f.id, f.effect, f.tokensSaved])).toEqual([["conserve-tokens-trap:s0", "trap", 10]]);
    expect(findings[0]?.patch).toEqual({
      op: "replace-section",
      blockId: "s0",
      body: "Write plainly.\nLead with the result.",
    });
  });

  test("stripConserveLines removes only the matching lines", () => {
    expect(stripConserveLines("Keep going.\nMinimize tokens where you can.\nDo less.\nStop.")).toBe(
      "Keep going.\nStop.",
    );
  });
});

describe("trimDescription", () => {
  test("keeps the first two plain sentences and drops the lecture and the example", () => {
    expect(
      trimDescription(
        "Create a Jira issue in a project. Returns the issue key and URL. Also does more.\n\nIMPORTANT: You MUST confirm the project key.\n\nExample: foo.\n```json\n{}\n```",
      ),
    ).toBe("Create a Jira issue in a project. Returns the issue key and URL.");
  });

  test("drops an emphasis line inside the first paragraph", () => {
    expect(trimDescription("Post a message.\nNEVER post without approval.\nReturns the ts.")).toBe(
      "Post a message. Returns the ts.",
    );
  });
});

describe("firstSentence", () => {
  test("returns the first sentence when it fits", () => {
    expect(firstSentence("Create a Jira issue. Returns the key.", 90)).toBe("Create a Jira issue.");
  });

  test("truncates with an ellipsis at the cap", () => {
    expect(
      firstSentence("Look up a Stripe customer by id or email and return the customer object with subscriptions.", 90),
    ).toBe("Look up a Stripe customer by id or email and return the customer object with subscripti...");
  });

  test("falls back for an empty description", () => {
    expect(firstSentence("", 90)).toBe("no description");
  });
});

describe("inline-example", () => {
  test("replaces a large fenced block with a pointer and leaves a small one", () => {
    const large = "```\n" + "const value = compute(input, options, context, fallback);\n".repeat(6) + "```";
    const body = `Intro.\n\n${large}\n\nSmall:\n\n\`\`\`\nx\n\`\`\``;
    expect(replaceLargeExamples(body, "Example: editing", count)).toBe(
      'Intro.\n\n(Example available on request: ask for the "Example: editing" reference.)\n\nSmall:\n\n```\nx\n```',
    );
  });
});

describe("duplicate-tool-docs", () => {
  test("a section naming three tools is deleted, and emphasis inside it is not reported separately", () => {
    const tools = toolsOf(
      '[{"name":"read_file","usage_pct":90},{"name":"edit_file","usage_pct":90},{"name":"run_shell","usage_pct":90}]',
    );
    const prompt = "## Tools\n\nUse `read_file` to read, `edit_file` to edit, and `run_shell` to run. You MUST use them.";
    const findings = findAll(docOf(prompt, tools), count);
    expect(findings.map((f) => [f.id, f.tokensSaved])).toEqual([["duplicate-tool-docs:s0", 31]]);
    expect(findings[0]?.detail).toContain("`read_file`, `edit_file`, `run_shell`");
  });
});

describe("findAll ordering", () => {
  test("largest saving first, then effect save, cache, trap, then block id", () => {
    const prompt =
      "## Rules\n\nIMPORTANT: You MUST run tests!\nNEVER guess.\n\n## Environment\n\nToday is 2026-09-25.\n\n## Style\n\nBe concise and conserve tokens.\nUse prose.";
    const findings = findAll(docOf(prompt, twoTools()), count);
    expect(findings.map((f) => [f.id, f.tokensSaved])).toEqual([
      ["offload-tool:t1", 85],
      ["conserve-tokens-trap:s2", 6],
      ["emphasis:s0", 5],
      ["volatile-in-prefix:s1", 0],
    ]);
  });
});
