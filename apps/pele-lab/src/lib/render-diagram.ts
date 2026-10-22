import { PeleError, render } from "pele";

export type RenderOutcome =
  | { ok: true; svg: string; mermaidType: string }
  | { ok: false; message: string };

export function renderDiagram(source: string): RenderOutcome {
  try {
    const result = render(source);
    return { ok: true, svg: result.svg, mermaidType: result.mermaidType };
  } catch (error) {
    if (error instanceof PeleError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
