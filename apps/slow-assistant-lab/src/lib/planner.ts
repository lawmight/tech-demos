import { lookupRestaurant } from "./goal";
import { confirmationCode, deriveOutcome, describeOutcome } from "./outcome";
import type { Goal, Levers, Restaurant, Skill, SkillParse, Step, ToolCall, World } from "./types";
import { FAST_TURN_MS, SLOW_TURN_MS } from "./world";

export const SLOW_LEVERS: Levers = { parallel: false, skill: false, fastTurns: false };
export const FAST_LEVERS: Levers = { parallel: true, skill: true, fastTurns: true };

export const GUEST_NAME = "Sam Rivera";
// What an agent without the skill guesses a booking form needs.
const GUESSED_BOOK_FIELDS = ["restaurant", "party_size", "time"];
const FORM_REJECTED = "form rejected: unknown fields, needs party_size and date";
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function planRun(goal: Goal, world: World, levers: Levers, skillParse: SkillParse | null): Step[] {
  const skill = levers.skill && skillParse?.ok ? skillParse.skill : null;
  const turnMs = levers.fastTurns ? FAST_TURN_MS : SLOW_TURN_MS;
  const restaurants = goal.candidates.map((name) => lookupRestaurant(world, name));
  // A skill that never says "parallel" overrides the lever, so editing the skill visibly changes the run.
  const parallel = levers.parallel && restaurants.length > 1 && (skill === null || skill.parallel);

  const steps: Step[] = [];
  const turn = (text: string) => steps.push({ kind: "turn", text, durationMs: turnMs });
  const batch = (calls: ToolCall[]) => steps.push({ kind: "tools", calls });

  const search = (r: Restaurant): ToolCall => ({
    tool: "search",
    args: { query: `${r.name} reservations` },
    ok: true,
    result: `found booking page for ${r.name}`,
    durationMs: world.durations.searchMs,
  });
  const rejectedCheck = (r: Restaurant): ToolCall => ({
    tool: "check_availability",
    args: { restaurant: r.name },
    ok: false,
    result: FORM_REJECTED,
    durationMs: r.checkMs,
  });
  const check = (r: Restaurant): ToolCall => ({
    tool: "check_availability",
    args: { restaurant: r.name, party_size: String(goal.partySize), date: "tonight" },
    ok: true,
    result: r.slots.length > 0 ? `available: ${sortedSlots(r).join(", ")}` : `no tables for ${goal.partySize} tonight`,
    durationMs: r.checkMs,
  });

  if (parallel) {
    const all = `all ${NUMBER_WORDS[restaurants.length] ?? restaurants.length}`;
    if (skill) {
      turn(`Skill ${skill.name} says check ${all} in parallel.`);
      batch(restaurants.map(check));
    } else {
      turn(`Looking up ${all} booking pages in parallel.`);
      batch(restaurants.map(search));
      turn(`Trying ${all} availability forms in parallel.`);
      batch(restaurants.map(rejectedCheck));
      turn(`Forms want party_size and date. Retrying ${all}.`);
      batch(restaurants.map(check));
    }
  } else {
    for (const [i, r] of restaurants.entries()) {
      const previous = restaurants[i - 1];
      if (skill) {
        turn(previous ? `${previous.name} is full. Checking ${r.name}.` : `Skill ${skill.name} loaded. Checking ${r.name} first.`);
        batch([check(r)]);
      } else {
        turn(
          previous
            ? `${previous.name} is full. Looking up ${r.name}'s booking page.`
            : `Checking ${r.name} first. Looking up its booking page.`,
        );
        batch([search(r)]);
        turn(`Found it. Trying ${r.name}'s availability form.`);
        batch([rejectedCheck(r)]);
        turn(`Form wants party_size and date. Retrying ${r.name}.`);
        batch([check(r)]);
      }
      if (r.slots.length > 0) break;
    }
  }

  const open = restaurants.find((r) => r.slots.length > 0);
  if (open) planBooking(open, goal, world, skill, turn, batch);

  const outcome = deriveOutcome(goal, steps);
  turn(outcome.booked ? "Booked. Reporting back to the user." : "Nothing open tonight. Reporting back to the user.");
  batch([
    {
      tool: "done",
      args: { summary: describeOutcome(outcome, goal.partySize) },
      ok: true,
      result: "reported to user",
      durationMs: world.durations.doneMs,
    },
  ]);
  return steps;
}

function planBooking(
  open: Restaurant,
  goal: Goal,
  world: World,
  skill: Skill | null,
  turn: (text: string) => void,
  batch: (calls: ToolCall[]) => void,
): void {
  const time = sortedSlots(open)[0] ?? "";
  const values: Record<string, string> = {
    restaurant: open.name,
    party_size: String(goal.partySize),
    time,
    name: GUEST_NAME,
  };
  const sent = skill ? skill.bookFields : GUESSED_BOOK_FIELDS;
  const missing = world.requiredBookFields.filter((field) => !sent.includes(field));
  const book = (fields: string[], ok: boolean, result: string): ToolCall => ({
    tool: "book",
    args: pick(values, fields),
    ok,
    result,
    durationMs: world.durations.bookMs,
  });

  turn(skill ? `${open.name} has ${time}. Booking with the skill's fields.` : `${open.name} has ${time}. Booking it.`);
  if (missing.length > 0) {
    batch([book(sent, false, `missing required fields: ${missing.join(", ")}`)]);
    turn(`Booking form wants ${missing.join(", ")}. Retrying with all fields.`);
  }
  batch([book(world.requiredBookFields, true, `confirmed ${confirmationCode(open.name, time, goal.partySize)}`)]);
}

function sortedSlots(r: Restaurant): string[] {
  return [...r.slots].sort();
}

function pick(values: Record<string, string>, fields: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field];
    if (value !== undefined) out[field] = value;
  }
  return out;
}
