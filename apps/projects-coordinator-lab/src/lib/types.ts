export const ROLES = ["ui", "api", "tests", "docs"] as const;
export type Role = (typeof ROLES)[number];

export const AGENT_NAMES: Record<Role, string> = {
  ui: "UI",
  api: "API",
  tests: "Tests",
  docs: "Docs",
};

export type TaskStatus = "queued" | "running" | "done" | "failed";

export type RuleId = "no-code" | "one-thread" | "reuse" | "results-return";

export interface TaskResult {
  summary: string;
  artifact: string;
}

export interface Task {
  id: string;
  turn: number;
  role: Role;
  title: string;
  status: TaskStatus;
  attempt: number;
  reused: boolean;
  injectFailure: boolean;
  elapsed: number;
  duration: number;
  progress: number;
  result: TaskResult | null;
}

/** One persistent subagent per role. Its id is its role. */
export interface Agent {
  role: Role;
  runs: number;
}

export type MessageKind =
  | "goal"
  | "followup"
  | "plan"
  | "decline"
  | "result"
  | "failure"
  | "retry"
  | "summary";

export interface Message {
  id: string;
  turn: number;
  author: "user" | "coordinator";
  kind: MessageKind;
  text: string;
  role?: Role;
  artifact?: string;
  rules: RuleId[];
}

export interface Settings {
  failure: boolean;
  autoplay: boolean;
  speed: 1 | 2 | 4;
}

export interface LabState {
  messages: Message[];
  tasks: Task[];
  agents: Agent[];
  turns: number;
  summarized: number[];
  settings: Settings;
}
