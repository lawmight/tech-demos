import type { PlannedTask, Plan } from "./planner";
import { AGENT_NAMES, type Message, type Task } from "./types";

export type NewMessage = Omit<Message, "id">;

export function userMessage(text: string, turn: number, followup: boolean): NewMessage {
  return { turn, author: "user", kind: followup ? "followup" : "goal", text, rules: [] };
}

function planLine(task: PlannedTask, index: number): string {
  const worker = task.reuse
    ? `reusing the ${AGENT_NAMES[task.role]} subagent`
    : `new ${AGENT_NAMES[task.role]} subagent`;
  return `${index + 1}. ${task.title} (${worker})`;
}

export function planMessage(plan: Plan, turn: number): NewMessage {
  const lead = plan.declined
    ? "I don't write code myself. I'm handing this to subagents instead."
    : "Here is the plan. I don't write code, so each task goes to a subagent.";
  const lines = plan.tasks.map(planLine);
  return {
    turn,
    author: "coordinator",
    kind: plan.declined ? "decline" : "plan",
    text: [lead, ...lines].join("\n"),
    rules: plan.rules,
  };
}

export function resultMessage(task: Task): NewMessage {
  const result = task.result;
  return {
    turn: task.turn,
    author: "coordinator",
    kind: "result",
    role: task.role,
    text: `${AGENT_NAMES[task.role]} is done. ${result?.summary ?? ""}`.trim(),
    artifact: result?.artifact,
    rules: ["results-return"],
  };
}

export function failureMessage(task: Task, willRetry: boolean): NewMessage {
  const name = AGENT_NAMES[task.role];
  return {
    turn: task.turn,
    author: "coordinator",
    kind: "failure",
    role: task.role,
    text: willRetry
      ? `${name} failed on attempt ${task.attempt}. I'll re-dispatch it.`
      : `${name} failed after ${task.attempt} attempts. I'm reporting it instead of retrying again.`,
    rules: ["results-return"],
  };
}

export function retryMessage(task: Task): NewMessage {
  return {
    turn: task.turn,
    author: "coordinator",
    kind: "retry",
    role: task.role,
    text: `Re-dispatched ${AGENT_NAMES[task.role]} for attempt ${task.attempt}.`,
    rules: [],
  };
}

export function summaryMessage(turn: number, tasks: readonly Task[]): NewMessage {
  const mine = tasks.filter((task) => task.turn === turn);
  const failed = mine.filter((task) => task.status === "failed");
  const lines = mine.map((task) =>
    task.status === "done"
      ? `${AGENT_NAMES[task.role]}: ${task.result?.summary ?? "done"}`
      : `${AGENT_NAMES[task.role]}: failed, needs attention`,
  );
  const lead =
    failed.length === 0
      ? `All ${mine.length} tasks are done. Everything is in this thread.`
      : `${mine.length - failed.length} of ${mine.length} tasks are done. ${failed.length} failed.`;
  return {
    turn,
    author: "coordinator",
    kind: "summary",
    text: [lead, ...lines].join("\n"),
    rules: ["results-return", "one-thread"],
  };
}
