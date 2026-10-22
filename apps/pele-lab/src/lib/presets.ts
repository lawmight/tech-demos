export const DEBOUNCE_MS = 250;

export const PRESET_IDS = [
  "flowchart",
  "sequence",
  "state",
  "agentflow",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export type Preset = {
  id: PresetId;
  label: string;
  source: string;
};

export const VILLAGE_DESKS = [
  "Tom",
  "Code",
  "Studio",
  "Leelhouse",
  "Sys",
  "CoS",
] as const;

export const VILLAGE_CONNECTORS = ["GitHub", "LLM"] as const;

const flowchart = `flowchart TD
  edit[Edit Mermaid] --> peleNode[Pele]
  peleNode --> svg[Themeable SVG]
  svg --> css[CSS variables]`;

const sequence = `sequenceDiagram
  participant Tom
  participant Code
  participant GitHub
  Tom->>Code: Ask for the change
  Code->>GitHub: Open the pull request
  GitHub-->>Code: Checks
  Code-->>Tom: Ready to review`;

const state = `stateDiagram-v2
  [*] --> Editing
  Editing --> Rendering: debounce
  Rendering --> Editing: source changed
  Rendering --> Error: PeleError
  Error --> Editing: fix source
  Rendering --> Shown: SVG`;

const agentflow = `agentflow-beta TB
  connector github["GitHub"]
  connector llm["LLM"]
  tom["Tom"]@{ shape: input }
  code["Code"]@{ shape: tool, connectorRef: "github.push" }
  studio["Studio"]@{ shape: task }
  leelhouse["Leelhouse"]@{ shape: task }
  sys["Sys"]@{ shape: task }
  cos["CoS"]@{ shape: tool, connectorRef: "llm.chat" }
  tom --> code
  code --> github
  tom --> studio
  tom --> leelhouse
  tom --> sys
  tom --> cos
  cos --> llm`;

export const presets = [
  { id: "flowchart", label: "Flowchart", source: flowchart },
  { id: "sequence", label: "Sequence", source: sequence },
  { id: "state", label: "State", source: state },
  { id: "agentflow", label: "Village agentflow", source: agentflow },
] as const satisfies readonly Preset[];

export function presetById(id: PresetId): Preset {
  const preset = presets.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Unknown preset ${id}`);
  }
  return preset;
}

export function quotedLabels(source: string): string[] {
  return [...source.matchAll(/\["([^"]+)"\]/g)].map((match) => match[1] ?? "");
}
