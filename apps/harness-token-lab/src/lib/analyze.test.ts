import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING, analyze, estimateCost } from "./analyze";
import { SAMPLE_PROMPT, SAMPLE_TOOLS } from "./sample";

describe("analyze", () => {
  test("invalid tools JSON returns ok:false with a JSON error", () => {
    const r = analyze(SAMPLE_PROMPT, "{nope", "o200k_base", null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.startsWith("Invalid JSON: ")).toBe(true);
  });

  test("an empty accepted set yields no savings", () => {
    const r = analyze(SAMPLE_PROMPT, SAMPLE_TOOLS, "o200k_base", new Set());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.rewrite.savings).toBe(0);
      expect(r.value.rewrite.after.total).toBe(r.value.rewrite.before.total);
      expect(r.value.rewrite.before.total).toBe(6249);
    }
  });

  test("accepting every finding on the sample reports 19 findings and a 62% saving", () => {
    const r = analyze(SAMPLE_PROMPT, SAMPLE_TOOLS, "o200k_base", null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.findings.length).toBe(19);
      expect(r.value.doc.sections.length).toBe(15);
      expect(r.value.doc.tools.length).toBe(13);
      expect(Math.round(r.value.rewrite.savings * 100)).toBe(62);
    }
  });

  test("accepting one finding by id applies only that patch (the pointer section heading costs 6 of the 583)", () => {
    const r = analyze(SAMPLE_PROMPT, SAMPLE_TOOLS, "o200k_base", new Set(["offload-tool:t1"]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const names = (JSON.parse(r.value.rewrite.toolsJson) as { name: string }[]).map((t) => t.name);
      expect(names.length).toBe(12);
      expect(names.includes("jira_create_issue")).toBe(false);
      expect(r.value.rewrite.before.total - r.value.rewrite.after.total).toBe(577);
    }
  });

  test("cl100k_base counts the sample with its own totals", () => {
    const r = analyze(SAMPLE_PROMPT, SAMPLE_TOOLS, "cl100k_base", null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.rewrite.before.total).toBe(6261);
      expect(r.value.rewrite.after.total).toBe(2366);
    }
  });
});

describe("estimateCost", () => {
  test("charges the prefix at the cached rate and the rest at the full rate", () => {
    expect(estimateCost({ prompt: 0, tools: 0, setup: 0, total: 1_000_000, prefix: 400_000 }, DEFAULT_PRICING)).toBe(
      600_000 * 2.5e-6 + 400_000 * 1.25e-6,
    );
    expect(
      estimateCost({ prompt: 0, tools: 0, setup: 0, total: 2000, prefix: 1000 }, { uncachedPerMtok: 3, cachedPerMtok: 0.3 }),
    ).toBeCloseTo(0.0033, 10);
  });
});
