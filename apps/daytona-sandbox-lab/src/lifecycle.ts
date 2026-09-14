/** Types shared by the server (drivers) and the browser (UI). Keep this file dependency-free. */

export type Mode = "mock" | "live";

export const LANGUAGES = ["python", "typescript", "javascript", "shell"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export const PHASES = ["create", "exec", "destroy"] as const;
export type Phase = (typeof PHASES)[number];

export type PhaseStatus = "pending" | "running" | "done" | "error" | "skipped";

/** Lifecycle states as reported by Daytona, plus `destroyed` which we emit after delete. */
export type SandboxState =
  | "pending"
  | "creating"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "destroying"
  | "destroyed"
  | "error"
  | (string & {});

export interface SandboxInfo {
  id: string;
  name: string;
  state: SandboxState;
  target: string;
  language: Language;
  cpu: number;
  /** GiB */
  memory: number;
  /** GiB */
  disk: number;
  ephemeral: boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  ms: number;
  /** true when the output was not produced by a real sandbox (mock mode) */
  simulated: boolean;
}

export interface RunRequest {
  language: Language;
  code: string;
  /** id of the preset the code came from, if unchanged; lets mock mode return canned output */
  presetId?: string;
}

export type LifecycleEvent =
  | { type: "phase"; phase: Phase; status: PhaseStatus; ms?: number }
  | { type: "log"; at: number; message: string }
  | { type: "sandbox"; sandbox: SandboxInfo }
  | { type: "exec"; result: ExecResult }
  | { type: "done"; totalMs: number }
  | { type: "error"; phase: Phase | null; message: string };

export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "create":
      return "Create";
    case "exec":
      return "Exec";
    case "destroy":
      return "Destroy";
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

export function languageLabel(language: Language): string {
  switch (language) {
    case "python":
      return "Python";
    case "typescript":
      return "TypeScript";
    case "javascript":
      return "JavaScript";
    case "shell":
      return "Shell";
    default: {
      const exhaustive: never = language;
      return exhaustive;
    }
  }
}
