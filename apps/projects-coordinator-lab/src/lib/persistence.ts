import { initialState } from "./dispatch";
import { ROLES, type LabState, type Message, type MessageKind, type RuleId } from "./types";

export const STORAGE_KEY = "projects-coordinator-lab:v1";

const STATUSES = ["queued", "running", "done", "failed"];
const MESSAGE_KINDS: readonly MessageKind[] = [
  "goal", "followup", "plan", "decline", "result", "failure", "retry", "summary",
];
const RULE_IDS: readonly RuleId[] = ["no-code", "one-thread", "reuse", "results-return"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRole(value: unknown): boolean {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.turn === "number" && Number.isSafeInteger(value.turn) && value.turn >= 0 &&
    (value.author === "user" || value.author === "coordinator") &&
    typeof value.kind === "string" && (MESSAGE_KINDS as readonly string[]).includes(value.kind) &&
    (value.role === undefined || isRole(value.role)) &&
    (value.artifact === undefined || typeof value.artifact === "string") &&
    Array.isArray(value.rules) &&
    value.rules.every((rule) => typeof rule === "string" && (RULE_IDS as readonly string[]).includes(rule))
  );
}

/** Parse untrusted localStorage text. Returns null unless the shape is usable. */
export function parseState(raw: string | null): LabState | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { messages, tasks, agents, turns, summarized, settings } = value;
  if (!Array.isArray(messages) || !Array.isArray(tasks) || !Array.isArray(agents)) return null;
  if (typeof turns !== "number" || !Array.isArray(summarized) || !isRecord(settings)) return null;
  const messagesOk = messages.every(isMessage);
  const tasksOk = tasks.every(
    (t) => isRecord(t) && isRole(t.role) && typeof t.status === "string" && STATUSES.includes(t.status),
  );
  const agentsOk = agents.every((a) => isRecord(a) && isRole(a.role) && typeof a.runs === "number");
  if (!messagesOk || !tasksOk || !agentsOk) return null;
  return { ...initialState(), ...(value as unknown as LabState) };
}

export function serializeState(state: LabState): string {
  return JSON.stringify(state);
}
