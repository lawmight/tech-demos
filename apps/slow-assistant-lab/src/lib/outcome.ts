import type { Goal, Outcome, Step } from "./types";

export function confirmationCode(restaurant: string, time: string, partySize: number): string {
  const initials = restaurant
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return `${initials}-${time.replace(":", "")}-${partySize}`;
}

export function deriveOutcome(goal: Goal, steps: Step[]): Outcome {
  for (const step of steps) {
    if (step.kind !== "tools") continue;
    const booked = step.calls.find((call) => call.tool === "book" && call.ok);
    if (booked) {
      const restaurant = booked.args.restaurant ?? "";
      const time = booked.args.time ?? "";
      return { booked: true, restaurant, time, code: confirmationCode(restaurant, time, goal.partySize) };
    }
  }
  if (goal.candidates.length === 0) return { booked: false, reason: "no candidate restaurants in the goal" };
  return { booked: false, reason: `no tables tonight at ${goal.candidates.join(", ")}` };
}

export function describeOutcome(outcome: Outcome, partySize: number): string {
  return outcome.booked
    ? `Booked ${outcome.restaurant} ${outcome.time} for ${partySize} · ${outcome.code}`
    : `No booking · ${outcome.reason}`;
}
