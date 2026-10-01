import type {
  CloudTask,
  EnvironmentRecipe,
  Laptop,
  PersistedState,
  Setting,
  SteerCommand,
  TaskBeat,
  TaskPhase,
} from "./types";

export const STORAGE_KEY = "codex-cloud-env-lab.v1";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function loadState(storage: StorageLike): PersistedState | null {
  return parseState(storage.getItem(STORAGE_KEY));
}

export function saveState(storage: StorageLike, state: PersistedState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(storage: StorageLike): void {
  storage.removeItem(STORAGE_KEY);
}

export function parseState(raw: string | null): PersistedState | null {
  if (raw === null || raw.trim().length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.environments)) {
    return null;
  }
  const environments: EnvironmentRecipe[] = [];
  for (const item of parsed.environments) {
    const environment = parseEnvironment(item);
    if (environment === null) {
      return null;
    }
    environments.push(environment);
  }
  if (parsed.task === null) {
    return { environments, task: null };
  }
  const task = parseTask(parsed.task);
  if (task === null) {
    return null;
  }
  return { environments, task };
}

function parseEnvironment(value: unknown): EnvironmentRecipe | null {
  if (!isRecord(value)) {
    return null;
  }
  const settings = parseSettings(value.settings);
  const dependencies = parseStringList(value.dependencies);
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.repoUrl !== "string" ||
    typeof value.setupScript !== "string" ||
    dependencies === null ||
    settings === null
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    repoUrl: value.repoUrl,
    dependencies,
    setupScript: value.setupScript,
    settings,
  };
}

function parseTask(value: unknown): CloudTask | null {
  if (!isRecord(value)) {
    return null;
  }
  const dependencies = parseStringList(value.dependencies);
  const log = parseStringList(value.log);
  const laptop = parseLaptop(value.laptop);
  const pendingSteer = parsePendingSteer(value.pendingSteer);
  const phase = parsePhase(value.phase);
  if (
    typeof value.id !== "string" ||
    typeof value.environmentId !== "string" ||
    typeof value.environmentName !== "string" ||
    typeof value.title !== "string" ||
    typeof value.seed !== "number" ||
    !Number.isFinite(value.seed) ||
    dependencies === null ||
    log === null ||
    laptop === null ||
    pendingSteer === undefined ||
    phase === null
  ) {
    return null;
  }
  return {
    id: value.id,
    environmentId: value.environmentId,
    environmentName: value.environmentName,
    dependencies,
    title: value.title,
    seed: value.seed,
    laptop,
    phase,
    pendingSteer,
    log,
  };
}

function parsePhase(value: unknown): TaskPhase | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  if (value.kind === "booting" && isIndex(value.index) && value.index <= 3) {
    return { kind: "booting", index: value.index };
  }
  if (value.kind === "running" && isIndex(value.index)) {
    const plan = parsePlan(value.plan);
    const steer = parsePendingSteer(value.steer);
    if (plan === null || steer === undefined) {
      return null;
    }
    return { kind: "running", index: value.index, plan, steer };
  }
  if (
    (value.kind === "done" || value.kind === "stopped") &&
    typeof value.summary === "string"
  ) {
    return { kind: value.kind, summary: value.summary };
  }
  return null;
}

function parsePlan(value: unknown): TaskBeat[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const plan: TaskBeat[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.label !== "string") {
      return null;
    }
    plan.push({ label: item.label });
  }
  return plan;
}

function parseSettings(value: unknown): Setting[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const settings: Setting[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.key !== "string" || typeof item.value !== "string") {
      return null;
    }
    settings.push({ key: item.key, value: item.value });
  }
  return settings;
}

function parseStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value;
}

function parseLaptop(value: unknown): Laptop | null {
  if (value === "open" || value === "closed") {
    return value;
  }
  return null;
}

function parsePendingSteer(value: unknown): SteerCommand | null | undefined {
  if (value === null) {
    return null;
  }
  if (value === "focus-on-tests" || value === "stop" || value === "approach-b") {
    return value;
  }
  return undefined;
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
