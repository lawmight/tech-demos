import { schedule } from "./dispatch";
import { parseGoal } from "./goal";
import { summarize } from "./metrics";
import { deriveOutcome } from "./outcome";
import { planRun } from "./planner";
import { parseSkill } from "./skill";
import type { Levers, Run, World } from "./types";

export function simulate(goalText: string, world: World, levers: Levers, skillText: string): Run {
  const goal = parseGoal(goalText);
  const steps = planRun(goal, world, levers, parseSkill(skillText));
  const timeline = schedule(steps);
  return { goal, levers, steps, timeline, metrics: summarize(steps, timeline), outcome: deriveOutcome(goal, steps) };
}
