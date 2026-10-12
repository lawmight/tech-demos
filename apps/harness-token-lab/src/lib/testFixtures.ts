import { parsePrompt, parseTools } from "./parse";
import { counterFor } from "./tokenizer";
import type { Doc, ToolBlock } from "./types";

export const count = counterFor("o200k_base");

export const TWO_TOOLS_JSON = JSON.stringify(
  [
    {
      name: "read_file",
      description: "Read a file and return its contents.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      usage_pct: 90,
    },
    {
      name: "jira_create_issue",
      description: "Create a Jira issue. Returns the key. IMPORTANT: You MUST confirm the project key first.",
      parameters: {
        type: "object",
        properties: { project_key: { type: "string" }, summary: { type: "string" } },
        required: ["project_key", "summary"],
      },
      usage_pct: 3,
    },
  ],
  null,
  2,
);

export function toolsOf(json: string): ToolBlock[] {
  const r = parseTools(json, count);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

export function twoTools(): ToolBlock[] {
  return toolsOf(TWO_TOOLS_JSON);
}

export function docOf(prompt: string, tools: ToolBlock[]): Doc {
  return { sections: parsePrompt(prompt, count), tools, encoding: "o200k_base" };
}
