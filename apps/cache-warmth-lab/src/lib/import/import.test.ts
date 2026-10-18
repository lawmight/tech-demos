import { describe, expect, test } from "bun:test";
import { claudeCodeFixture } from "./__fixtures__/claudeCode";
import { codexFixture } from "./__fixtures__/codex";
import { genericFixture } from "./__fixtures__/generic";
import { parseClaudeCodeJsonl } from "./claudeCode";
import { parseCodexJsonl } from "./codex";
import { parseGenericUsage } from "./generic";

describe("import adapters", () => {
  test("claude code jsonl sums uncached, cache write, and cache read into the prompt", () => {
    const result = parseClaudeCodeJsonl(claudeCodeFixture);
    expect(result.warnings).toEqual(["line 3 is not JSON"]);
    expect(result.session?.turns).toEqual([
      {
        id: "claude-1",
        atMs: 0,
        label: "Claude Code turn (claude-sonnet-5-5)",
        promptTokens: 8_400,
        outputTokens: 220,
      },
      {
        id: "claude-2",
        atMs: 60_000,
        label: "Claude Code turn (claude-sonnet-5-5)",
        promptTokens: 8_780,
        outputTokens: 90,
      },
    ]);
  });

  test("codex uses last_token_usage and falls back to cumulative deltas", () => {
    const result = parseCodexJsonl(codexFixture);
    expect(result.warnings).toEqual([]);
    expect(result.session?.turns).toEqual([
      {
        id: "codex-2",
        atMs: 0,
        label: "Codex turn (gpt-6.1-sol)",
        promptTokens: 3_000,
        outputTokens: 400,
      },
      {
        id: "codex-3",
        atMs: 100_000,
        label: "Codex turn (gpt-6.1-sol)",
        promptTokens: 2_200,
        outputTokens: 300,
      },
    ]);
  });

  test("generic json accepts iso timestamps and reports a bad row", () => {
    const result = parseGenericUsage(genericFixture);
    expect(result.warnings).toEqual([]);
    expect(result.session?.turns[0]).toEqual({
      id: "generic-1",
      atMs: 0,
      label: "cursor / composer-2.5",
      promptTokens: 4_200,
      outputTokens: 300,
    });
    expect(result.session?.turns[1]?.atMs).toBe(60_000);
    expect(result.session?.turns[1]?.promptTokens).toBe(5_000);
    const numeric = parseGenericUsage(
      JSON.stringify([{ ts: 1_000, inputTokens: 10, outputTokens: 2 }, { ts: "nope", inputTokens: 1, outputTokens: 1 }]),
    );
    expect(numeric.session?.turns).toEqual([
      { id: "generic-1", atMs: 0, label: "Usage row 1", promptTokens: 10, outputTokens: 2 },
    ]);
    expect(numeric.warnings).toEqual(["row 2 needs ts, inputTokens, and outputTokens"]);
  });
});
