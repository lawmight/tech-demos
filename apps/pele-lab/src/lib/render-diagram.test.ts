import { expect, test } from "bun:test";
import { presetById, presets } from "./presets.ts";
import { renderDiagram } from "./render-diagram.ts";

test("renderDiagram returns SVG for the flowchart preset", () => {
  const outcome = renderDiagram(presetById("flowchart").source);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  expect(outcome.svg).toContain("<svg");
  expect(outcome.svg).toContain("pele");
  expect(outcome.svg).toContain("Themeable SVG");
  expect(outcome.mermaidType).toBe("flowchart-v2");
});

test("every preset renders with Pele", () => {
  for (const preset of presets) {
    const outcome = renderDiagram(preset.source);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.svg.startsWith("<svg")).toBe(true);
  }
});

test("renderDiagram returns PeleError.message for unknown syntax", () => {
  const outcome = renderDiagram("this is not mermaid");
  expect(outcome).toEqual({
    ok: false,
    message: "No diagram type detected for the given text.",
  });
});

test("package depends on pele and not mermaid", async () => {
  const pkg = (await Bun.file(
    new URL("../../package.json", import.meta.url),
  ).json()) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  expect(pkg.dependencies?.pele).toBeDefined();
  const names = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ];
  expect(names).not.toContain("mermaid");
});
