export type Setting = {
  key: string;
  value: string;
};

export type RecipeDraft = {
  name: string;
  repoUrl: string;
  dependencies: string[];
  setupScript: string;
  settings: Setting[];
};

export type EnvironmentRecipe = RecipeDraft & {
  id: string;
};

export type RecipeField = "name" | "repoUrl" | "dependencies" | "setupScript" | "settings";

export type RecipeIssue = {
  field: RecipeField;
  message: string;
};

export type Laptop = "open" | "closed";

export type SteerCommand = "focus-on-tests" | "stop" | "approach-b";

export type TaskBeat = {
  label: string;
};

export type TaskPhase =
  | { kind: "booting"; index: number }
  | { kind: "running"; index: number; plan: TaskBeat[]; steer: SteerCommand | null }
  | { kind: "done"; summary: string }
  | { kind: "stopped"; summary: string };

export type CloudTask = {
  id: string;
  environmentId: string;
  environmentName: string;
  dependencies: string[];
  title: string;
  seed: number;
  laptop: Laptop;
  phase: TaskPhase;
  pendingSteer: SteerCommand | null;
  log: string[];
};

export type TaskEvent =
  | { type: "tick" }
  | { type: "close-laptop" }
  | { type: "open-laptop" }
  | { type: "steer"; command: SteerCommand };

export type PersistedState = {
  environments: EnvironmentRecipe[];
  task: CloudTask | null;
};
