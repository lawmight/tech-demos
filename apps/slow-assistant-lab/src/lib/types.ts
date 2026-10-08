export type ToolName = "search" | "check_availability" | "book" | "done";

export type Restaurant = {
  name: string;
  slots: string[];
  checkMs: number;
};

export type World = {
  restaurants: Restaurant[];
  requiredBookFields: string[];
  durations: { searchMs: number; bookMs: number; doneMs: number };
};

export type Goal = {
  text: string;
  partySize: number;
  candidates: string[];
};

export type Levers = {
  parallel: boolean;
  skill: boolean;
  fastTurns: boolean;
};

export type Skill = {
  name: string;
  steps: string[];
  parallel: boolean;
  bookFields: string[];
};

export type SkillParse =
  | { ok: true; skill: Skill }
  | { ok: false; error: string };

export type ToolCall = {
  tool: ToolName;
  args: Record<string, string>;
  ok: boolean;
  result: string;
  durationMs: number;
};

export type Step =
  | { kind: "turn"; text: string; durationMs: number }
  | { kind: "tools"; calls: ToolCall[] };

export type Outcome =
  | { booked: true; restaurant: string; time: string; code: string }
  | { booked: false; reason: string };

export type TimelineEvent = {
  id: string;
  kind: "turn" | ToolName;
  label: string;
  ok: boolean;
  lane: number;
  stepIndex: number;
  startMs: number;
  endMs: number;
};

export type Metrics = {
  toolCalls: number;
  modelTurns: number;
  parallelBatches: number;
  failedCalls: number;
  wallMs: number;
};

export type Run = {
  goal: Goal;
  levers: Levers;
  steps: Step[];
  timeline: TimelineEvent[];
  metrics: Metrics;
  outcome: Outcome;
};
