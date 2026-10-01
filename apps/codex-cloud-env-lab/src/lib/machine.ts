import { planLabels, steerLogLine } from "./steer";
import type { CloudTask, EnvironmentRecipe, SteerCommand, TaskBeat, TaskEvent } from "./types";

const BOOT_LABELS = [
  "Pulling recipe",
  "Installing dependencies",
  "Running setup script",
  "Environment ready",
] as const;

const SEEDED_NOTES = [
  "Setup script already in the recipe.",
  "Dependencies came from the saved recipe.",
  "Workdir came from the saved settings.",
] as const;

export const TICK_MS = 3000;

export function taskSeed(environmentId: string, title: string): number {
  let hash = 0;
  const text = `${environmentId}:${title}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function startTask(input: {
  id: string;
  environment: EnvironmentRecipe;
  title: string;
}): CloudTask {
  const title = input.title.trim();
  const seed = taskSeed(input.environment.id, title);
  return {
    id: input.id,
    environmentId: input.environment.id,
    environmentName: input.environment.name,
    dependencies: [...input.environment.dependencies],
    title,
    seed,
    laptop: "open",
    pendingSteer: null,
    phase: { kind: "booting", index: 0 },
    log: [bootLine(0, input.environment.name, input.environment.dependencies)],
  };
}

export function reduceTask(task: CloudTask, event: TaskEvent): CloudTask {
  switch (event.type) {
    case "close-laptop":
      return closeLaptop(task);
    case "open-laptop":
      return openLaptop(task);
    case "steer":
      return steerTask(task, event.command);
    case "tick":
      return tickTask(task);
    default: {
      const neverEvent: never = event;
      return neverEvent;
    }
  }
}

export function taskIsActive(task: CloudTask | null): boolean {
  return task !== null && (task.phase.kind === "booting" || task.phase.kind === "running");
}

export function taskStatusLabel(task: CloudTask): string {
  switch (task.phase.kind) {
    case "booting":
      return "Booting environment";
    case "running":
      return task.phase.index === 0 ? "Queued" : "Running";
    case "done":
      return "Done";
    case "stopped":
      return "Stopped";
    default: {
      const neverPhase: never = task.phase;
      return neverPhase;
    }
  }
}

export function resultSummary(task: CloudTask): string | null {
  if (task.phase.kind === "done" || task.phase.kind === "stopped") {
    return task.phase.summary;
  }
  return null;
}

function closeLaptop(task: CloudTask): CloudTask {
  if (task.laptop === "closed") {
    return task;
  }
  return {
    ...task,
    laptop: "closed",
    log: [...task.log, "Laptop closed. The cloud task keeps running."],
  };
}

function openLaptop(task: CloudTask): CloudTask {
  if (task.laptop === "open") {
    return task;
  }
  return {
    ...task,
    laptop: "open",
    log: [...task.log, "Laptop open. Same cloud task."],
  };
}

function steerTask(task: CloudTask, command: SteerCommand): CloudTask {
  if (task.phase.kind === "done" || task.phase.kind === "stopped") {
    return task;
  }
  if (command === "stop") {
    const summary = stoppedSummary(task);
    return {
      ...task,
      pendingSteer: null,
      phase: { kind: "stopped", summary },
      log: [...task.log, steerLogLine(command), summary],
    };
  }
  if (task.phase.kind === "booting") {
    if (task.pendingSteer === command) {
      return task;
    }
    return {
      ...task,
      pendingSteer: command,
      log: [...task.log, steerLogLine(command)],
    };
  }
  if (task.phase.steer === command) {
    return task;
  }
  const completed = task.phase.plan.slice(0, task.phase.index);
  const plan = [...completed, ...beats(planLabels(command))];
  return {
    ...task,
    pendingSteer: null,
    phase: { kind: "running", index: task.phase.index, plan, steer: command },
    log: [...task.log, steerLogLine(command)],
  };
}

function tickTask(task: CloudTask): CloudTask {
  if (task.phase.kind === "done" || task.phase.kind === "stopped") {
    return task;
  }
  if (task.phase.kind === "booting") {
    if (task.phase.index < BOOT_LABELS.length - 1) {
      const index = task.phase.index + 1;
      return {
        ...task,
        phase: { kind: "booting", index },
        log: [...task.log, bootLine(index, task.environmentName, task.dependencies)],
      };
    }
    const steer = task.pendingSteer;
    return {
      ...task,
      pendingSteer: null,
      phase: { kind: "running", index: 0, plan: beats(planLabels(steer)), steer },
      log: [...task.log, `Queued: ${task.title}`],
    };
  }

  const beat = task.phase.plan[task.phase.index];
  if (beat === undefined) {
    const summary = doneSummary(task, task.phase.steer);
    return { ...task, phase: { kind: "done", summary }, log: [...task.log, summary] };
  }

  const stepLine = `Work: ${beat.label}`;
  const nextIndex = task.phase.index + 1;
  if (nextIndex >= task.phase.plan.length) {
    const summary = doneSummary(task, task.phase.steer);
    return {
      ...task,
      phase: { kind: "done", summary },
      log: [...task.log, stepLine, summary],
    };
  }
  return {
    ...task,
    phase: { ...task.phase, index: nextIndex },
    log: [...task.log, stepLine],
  };
}

function beats(labels: readonly string[]): TaskBeat[] {
  return labels.map((label) => ({ label }));
}

function bootLine(index: number, environmentName: string, dependencies: string[]): string {
  if (index === 0) {
    return `Boot 1/4: Pulling recipe ${environmentName}`;
  }
  if (index === 1) {
    return `Boot 2/4: Installing dependencies: ${dependencies.join(", ")}`;
  }
  if (index === 2) {
    return "Boot 3/4: Running setup script";
  }
  if (index === 3) {
    return "Boot 4/4: Environment ready";
  }
  throw new Error(`boot step ${index} is out of range`);
}

function seededNote(seed: number): string {
  const note = SEEDED_NOTES[seed % SEEDED_NOTES.length];
  if (note === undefined) {
    throw new Error(`seed note ${seed} is missing`);
  }
  return note;
}

function doneSummary(task: CloudTask, steer: SteerCommand | null): string {
  const base = `Done: ${task.title} in ${task.environmentName}.`;
  const note = seededNote(task.seed);
  switch (steer) {
    case "focus-on-tests":
      return `${base} The phone steer focused the rest of the run on tests. ${note}`;
    case "approach-b":
      return `${base} The phone steer switched the rest of the run to approach B. ${note}`;
    case null:
    case "stop":
      return `${base} The cloud task finished the default plan. ${note}`;
    default: {
      const neverSteer: never = steer;
      return neverSteer;
    }
  }
}

function stoppedSummary(task: CloudTask): string {
  return `Stopped: ${task.title} in ${task.environmentName}. The phone steer halted the cloud task. ${seededNote(task.seed)}`;
}
