import { describe, expect, test } from "bun:test";
import { canonicalToolJson, parsePrompt, parseTools, toolKeyOrderIsCanonical, withBody } from "./parse";
import { counterFor } from "./tokenizer";

const count = counterFor("o200k_base");

describe("parsePrompt", () => {
  test("splits on markdown headings with ids s0 s1 s2", () => {
    const sections = parsePrompt("# Alpha\none\n\n## Beta\ntwo\n\n### Gamma\nthree", count);
    expect(sections.map((s) => s.id)).toEqual(["s0", "s1", "s2"]);
    expect(sections.map((s) => s.heading)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(sections[1]?.body).toBe("two");
    expect(sections[1]?.text).toBe("## Beta\ntwo");
  });

  test("a leading unheaded paragraph becomes a section with heading null", () => {
    const sections = parsePrompt("intro text\n\n# Alpha\none", count);
    expect(sections.map((s) => s.heading)).toEqual([null, "Alpha"]);
    expect(sections[0]?.body).toBe("intro text");
  });

  test("falls back to blank-line blocks when there are no headings", () => {
    const sections = parsePrompt("one\n\ntwo\n\n\nthree", count);
    expect(sections.map((s) => s.text)).toEqual(["one", "two", "three"]);
    expect(sections.map((s) => s.heading)).toEqual([null, null, null]);
  });

  test("fills tokens and volatile matches", () => {
    const sections = parsePrompt("## Environment\nToday is 2026-09-25.", count);
    expect(sections[0]?.tokens).toBe(13);
    expect(sections[0]?.volatile).toEqual([
      { kind: "date", match: "2026-09-25" },
      { kind: "date", match: "Today is" },
    ]);
  });
});

describe("parseTools", () => {
  test("invalid JSON reports a JSON error", () => {
    const r = parseTools("{nope", count);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("JSON");
  });

  test("rejects a tool without a name", () => {
    const r = parseTools('[{"description":"x"}]', count);
    expect(r).toEqual({ ok: false, error: "Tool #1: expected an array of tools with a `name` string." });
  });

  test("accepts a {tools: [...]} wrapper", () => {
    const r = parseTools('{"tools":[{"name":"a","description":"d"}]}', count);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((t) => [t.id, t.name, t.core, t.usagePct])).toEqual([["t0", "a", false, null]]);
    }
  });

  test("resolves schema, usage, and the core flag", () => {
    const r = parseTools(
      '[{"name":"read_file","input_schema":{"type":"object"},"usage_pct":140},{"name":"jira_create_issue","parameters":{"type":"object"},"usage_pct":3}]',
      count,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((t) => [t.name, t.core, t.usagePct, t.schema])).toEqual([
        ["read_file", true, 100, { type: "object" }],
        ["jira_create_issue", false, 3, { type: "object" }],
      ]);
    }
  });
});

describe("canonicalToolJson", () => {
  test("orders name, description, schema and sorts nested keys", () => {
    const json = canonicalToolJson({
      parameters: { type: "object", properties: { b: { type: "string" }, a: { type: "string" } } },
      description: "d",
      name: "a",
    });
    expect(json).toBe(
      [
        "{",
        '  "name": "a",',
        '  "description": "d",',
        '  "parameters": {',
        '    "properties": {',
        '      "a": {',
        '        "type": "string"',
        "      },",
        '      "b": {',
        '        "type": "string"',
        "      }",
        "    },",
        '    "type": "object"',
        "  }",
        "}",
      ].join("\n"),
    );
  });

  test("keeps input_schema when that is the key the input used and drops usage_pct", () => {
    expect(canonicalToolJson({ name: "x", input_schema: { type: "object" }, usage_pct: 5 })).toBe(
      '{\n  "name": "x",\n  "input_schema": {\n    "type": "object"\n  }\n}',
    );
  });
});

describe("toolKeyOrderIsCanonical", () => {
  test("false when description precedes name", () => {
    expect(toolKeyOrderIsCanonical('[{"description":"x","name":"a"}]')).toBe(false);
  });

  test("true for name, description, parameters", () => {
    expect(toolKeyOrderIsCanonical('[{"name":"a","description":"x","parameters":{}}]')).toBe(true);
  });

  test("false for text that is not JSON", () => {
    expect(toolKeyOrderIsCanonical("nope")).toBe(false);
  });
});

describe("withBody", () => {
  test("keeps the heading line and swaps the body", () => {
    const section = parsePrompt("## Style\n\nOld body.", count)[0];
    expect(section).toBeDefined();
    if (section) expect(withBody(section, "New body.")).toBe("## Style\n\nNew body.");
  });
});
