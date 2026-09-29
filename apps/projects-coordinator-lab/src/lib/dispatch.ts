import {
  failureMessage,
  planMessage,
  resultMessage,
  retryMessage,
  summaryMessage,
  userMessage,
  type NewMessage,
} from "./fold";
import { plan } from "./planner";
import type { Agent, LabState, Role, Settings, Task } from "./types";
import { durationFor, simulateResult } from "./work";

export const CONCURRENCY = 2;
export const MAX_ATTEMPTS = 2;
export const FAIL_AT_PROGRESS = 60;

export type Action =
  | { type: "send"; text: string }
  | { type: "tick" }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "reset" };

export function initialState(): LabState {
  return {
    messages: [],
    tasks: [],
    agents: [],
    turns: 0,
    summarized: [],
    settings: { failure: false, autoplay: true, speed: 1 },
  };
}

function append(state: LabState, added: readonly NewMessage[]): LabState {
  const messages = [
    ...state.messages,
    ...added.map((message, i) => ({ ...message, id: `m${state.messages.length + i + 1}` })),
  ];
  return { ...state, messages };
}

function replaceTask(state: LabState, next: Task): LabState {
  return { ...state, tasks: state.tasks.map((task) => (task.id === next.id ? next : task)) };
}

function failureTarget(roles: readonly Role[]): Role | undefined {
  return roles.includes("api") ? "api" : roles[0];
}

export function send(state: LabState, rawText: string): LabState {
  const text = rawText.trim();
  if (text === "") return state;
  const turn = state.turns + 1;
  const existing = state.agents.map((agent) => agent.role);
  const planned = plan(text, existing);
  const target = state.settings.failure ? failureTarget(planned.tasks.map((t) => t.role)) : undefined;

  const agents: Agent[] = [...state.agents];
  for (const { role } of planned.tasks) {
    const agent = agents.find((a) => a.role === role);
    if (agent) agents[agents.indexOf(agent)] = { ...agent, runs: agent.runs + 1 };
    else agents.push({ role, runs: 1 });
  }
  const tasks: Task[] = planned.tasks.map((item, i) => ({
    id: `t${state.tasks.length + i + 1}`,
    turn,
    role: item.role,
    title: item.title,
    status: "queued",
    attempt: 1,
    reused: item.reuse,
    injectFailure: item.role === target,
    elapsed: 0,
    duration: durationFor(item.role, item.title),
    progress: 0,
    result: null,
  }));

  return append(
    { ...state, turns: turn, agents, tasks: [...state.tasks, ...tasks] },
    [userMessage(text, turn, state.turns > 0), planMessage(planned, turn)],
  );
}

function advanceRunning(state: LabState): LabState {
  let next = state;
  for (const task of state.tasks.filter((t) => t.status === "running")) {
    const elapsed = task.elapsed + 1;
    const progress = Math.min(100, Math.round((elapsed * 100) / task.duration));
    if (task.injectFailure && progress >= FAIL_AT_PROGRESS) {
      const failed: Task = { ...task, elapsed, progress: FAIL_AT_PROGRESS, status: "failed" };
      next = append(replaceTask(next, failed), [failureMessage(failed, failed.attempt < MAX_ATTEMPTS)]);
    } else if (progress >= 100) {
      const done: Task = { ...task, elapsed, progress: 100, status: "done", result: simulateResult(task) };
      next = append(replaceTask(next, done), [resultMessage(done)]);
    } else {
      next = replaceTask(next, { ...task, elapsed, progress });
    }
  }
  return next;
}

function redispatchFailed(state: LabState): LabState {
  let next = state;
  for (const task of state.tasks.filter((t) => t.status === "failed" && t.attempt < MAX_ATTEMPTS)) {
    const retried: Task = {
      ...task,
      status: "queued",
      attempt: task.attempt + 1,
      injectFailure: false,
      elapsed: 0,
      progress: 0,
    };
    next = append(replaceTask(next, retried), [retryMessage(retried)]);
  }
  return next;
}

function startQueued(state: LabState): LabState {
  let next = state;
  for (const task of state.tasks.filter((t) => t.status === "queued")) {
    const running = next.tasks.filter((t) => t.status === "running");
    const agentBusy = running.some((t) => t.role === task.role);
    if (running.length >= CONCURRENCY || agentBusy) continue;
    next = replaceTask(next, { ...task, status: "running" });
  }
  return next;
}

export function isTurnSettled(state: LabState, turn: number): boolean {
  const mine = state.tasks.filter((t) => t.turn === turn);
  return (
    mine.length > 0 &&
    mine.every((t) => t.status === "done" || (t.status === "failed" && t.attempt >= MAX_ATTEMPTS))
  );
}

function summarizeSettled(state: LabState): LabState {
  let next = state;
  for (let turn = 1; turn <= state.turns; turn++) {
    if (next.summarized.includes(turn) || !isTurnSettled(next, turn)) continue;
    next = append({ ...next, summarized: [...next.summarized, turn] }, [summaryMessage(turn, next.tasks)]);
  }
  return next;
}

export function tick(state: LabState): LabState {
  return summarizeSettled(startQueued(advanceRunning(redispatchFailed(state))));
}

export function hasWork(state: LabState): boolean {
  return state.tasks.some(
    (t) => t.status === "queued" || t.status === "running" || (t.status === "failed" && t.attempt < MAX_ATTEMPTS),
  );
}

/** The task an agent card should show: running, else queued, else the latest finished. */
export function currentTask(state: LabState, role: Role): Task | undefined {
  const mine = state.tasks.filter((t) => t.role === role);
  return (
    mine.find((t) => t.status === "running") ??
    mine.find((t) => t.status === "queued") ??
    mine[mine.length - 1]
  );
}

export function reduce(state: LabState, action: Action): LabState {
  switch (action.type) {
    case "send":
      return send(state, action.text);
    case "tick":
      return tick(state);
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return { ...initialState(), settings: state.settings };
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
