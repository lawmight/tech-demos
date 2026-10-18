export const STAGES = ["brief", "plan", "playable", "critic"] as const;
export type Stage = (typeof STAGES)[number];

export const PLAN_ITEMS: readonly string[] = [
  "Two heroes, one keyboard (WASD + arrows)",
  "Two color-coded pools, one safe for each hero",
  "A plate that holds the door open for the other hero",
  "A latch beyond the door so the holder can follow",
  "Exits for both, win banner when both arrive",
];

export interface Verdict {
  pass: boolean;
  score: number;
}

export interface StageState {
  viewing: Stage;
  briefLocked: boolean;
  plan: readonly boolean[];
  verdict: Verdict | null;
}

export type StageEvent =
  | { type: "lock-brief" }
  | { type: "toggle-plan"; index: number }
  | { type: "view"; stage: Stage }
  | { type: "captured"; verdict: Verdict }
  | { type: "reset-level" };

export type StageStatus = "done" | "current" | "locked";

export function initialStages(): StageState {
  return {
    viewing: "brief",
    briefLocked: false,
    plan: PLAN_ITEMS.map(() => false),
    verdict: null,
  };
}

function passed(state: StageState, stage: Stage): boolean {
  switch (stage) {
    case "brief":
      return state.briefLocked;
    case "plan":
      return state.plan.every(Boolean);
    case "playable":
      return state.verdict !== null;
    case "critic":
      return state.verdict?.pass === true;
    default: {
      const unreachable: never = stage;
      return unreachable;
    }
  }
}

export function currentStage(state: StageState): Stage {
  return STAGES.find((s) => !passed(state, s)) ?? "critic";
}

export function stageStatus(state: StageState, stage: Stage): StageStatus {
  if (!canView(state, stage)) return "locked";
  return passed(state, stage) ? "done" : "current";
}

/** A stage opens once every earlier stage has passed its gate. */
export function canView(state: StageState, stage: Stage): boolean {
  return STAGES.slice(0, STAGES.indexOf(stage)).every((s) => passed(state, s));
}

export function allPassed(state: StageState): boolean {
  return STAGES.every((s) => passed(state, s));
}

function settle(state: StageState, preferred: Stage): StageState {
  return { ...state, viewing: canView(state, preferred) ? preferred : currentStage(state) };
}

export function reduceStages(state: StageState, event: StageEvent): StageState {
  switch (event.type) {
    case "lock-brief":
      return settle({ ...state, briefLocked: true }, "plan");
    case "toggle-plan": {
      const plan = state.plan.map((done, i) => (i === event.index ? !done : done));
      const next = { ...state, plan };
      return settle(next, plan.every(Boolean) ? "playable" : state.viewing);
    }
    case "view":
      return canView(state, event.stage) ? { ...state, viewing: event.stage } : state;
    case "captured":
      return settle({ ...state, verdict: event.verdict }, "critic");
    case "reset-level":
      return settle({ ...state, verdict: null }, "playable");
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}
