import { initialState } from "./dispatch";
import { ROLES, type LabState } from "./types";

export const STORAGE_KEY = "projects-coordinator-lab:v1";

const STATUSES = ["queued", "running", "done", "failed"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRole(value: unknown): boolean {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
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
  const messagesOk = messages.every((m) => isRecord(m) && typeof m.id === "string" && typeof m.text === "string");
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
