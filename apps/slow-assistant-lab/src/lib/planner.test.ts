import { describe, expect, test } from "bun:test";
import { parseGoal } from "./goal";
import { FAST_LEVERS, SLOW_LEVERS, planRun } from "./planner";
import { SAMPLE_SKILL, parseSkill } from "./skill";
import type { Step, World } from "./types";
import { DEFAULT_GOAL, DEFAULT_WORLD } from "./world";

const sample = parseSkill(SAMPLE_SKILL);

function sig(steps: Step[]): string[] {
  return steps.map((s) => {
    switch (s.kind) {
      case "turn":
        return `turn ${s.durationMs}: ${s.text}`;
      case "tools":
        return s.calls
          .map((c) => `${c.tool}(${Object.values(c.args).join(", ")}) ${c.durationMs} ${c.ok ? "ok" : "FAIL"}: ${c.result}`)
          .join(" | ");
      default: {
        const never: never = s;
        return never;
      }
    }
  });
}

const FORM_REJECTED = "form rejected: unknown fields, needs party_size and date";

describe("planRun levers", () => {
  test("lever presets", () => {
    expect(SLOW_LEVERS).toEqual({ parallel: false, skill: false, fastTurns: false });
    expect(FAST_LEVERS).toEqual({ parallel: true, skill: true, fastTurns: true });
  });

  test("fast default: one parallel check batch, skill-guided book, three short turns", () => {
    expect(planRun(DEFAULT_GOAL, DEFAULT_WORLD, FAST_LEVERS, sample)).toEqual([
      { kind: "turn", text: "Skill book-dinner says check all three in parallel.", durationMs: 600 },
      {
        kind: "tools",
        calls: [
          {
            tool: "check_availability",
            args: { restaurant: "A Mano", party_size: "2", date: "tonight" },
            ok: true,
            result: "no tables for 2 tonight",
            durationMs: 5200,
          },
          {
            tool: "check_availability",
            args: { restaurant: "II Borgo", party_size: "2", date: "tonight" },
            ok: true,
            result: "no tables for 2 tonight",
            durationMs: 6000,
          },
          {
            tool: "check_availability",
            args: { restaurant: "Doppio Zero", party_size: "2", date: "tonight" },
            ok: true,
            result: "available: 19:30",
            durationMs: 4400,
          },
        ],
      },
      { kind: "turn", text: "Doppio Zero has 19:30. Booking with the skill's fields.", durationMs: 600 },
      {
        kind: "tools",
        calls: [
          {
            tool: "book",
            args: { restaurant: "Doppio Zero", party_size: "2", time: "19:30", name: "Sam Rivera" },
            ok: true,
            result: "confirmed DZ-1930-2",
            durationMs: 8000,
          },
        ],
      },
      { kind: "turn", text: "Booked. Reporting back to the user.", durationMs: 600 },
      {
        kind: "tools",
        calls: [
          {
            tool: "done",
            args: { summary: "Booked Doppio Zero 19:30 for 2 · DZ-1930-2" },
            ok: true,
            result: "reported to user",
            durationMs: 200,
          },
        ],
      },
    ]);
  });

  test("slow default: one-by-one search, failed form, retry, failed book, retry", () => {
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, SLOW_LEVERS, sample))).toEqual([
      "turn 9000: Checking A Mano first. Looking up its booking page.",
      "search(A Mano reservations) 4000 ok: found booking page for A Mano",
      "turn 9000: Found it. Trying A Mano's availability form.",
      `check_availability(A Mano) 5200 FAIL: ${FORM_REJECTED}`,
      "turn 9000: Form wants party_size and date. Retrying A Mano.",
      "check_availability(A Mano, 2, tonight) 5200 ok: no tables for 2 tonight",
      "turn 9000: A Mano is full. Looking up II Borgo's booking page.",
      "search(II Borgo reservations) 4000 ok: found booking page for II Borgo",
      "turn 9000: Found it. Trying II Borgo's availability form.",
      `check_availability(II Borgo) 6000 FAIL: ${FORM_REJECTED}`,
      "turn 9000: Form wants party_size and date. Retrying II Borgo.",
      "check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight",
      "turn 9000: II Borgo is full. Looking up Doppio Zero's booking page.",
      "search(Doppio Zero reservations) 4000 ok: found booking page for Doppio Zero",
      "turn 9000: Found it. Trying Doppio Zero's availability form.",
      `check_availability(Doppio Zero) 4400 FAIL: ${FORM_REJECTED}`,
      "turn 9000: Form wants party_size and date. Retrying Doppio Zero.",
      "check_availability(Doppio Zero, 2, tonight) 4400 ok: available: 19:30",
      "turn 9000: Doppio Zero has 19:30. Booking it.",
      "book(Doppio Zero, 2, 19:30) 8000 FAIL: missing required fields: name",
      "turn 9000: Booking form wants name. Retrying with all fields.",
      "book(Doppio Zero, 2, 19:30, Sam Rivera) 8000 ok: confirmed DZ-1930-2",
      "turn 9000: Booked. Reporting back to the user.",
      "done(Booked Doppio Zero 19:30 for 2 · DZ-1930-2) 200 ok: reported to user",
    ]);
  });

  test("parallel alone: same discovery work, grouped into three batches", () => {
    const levers = { parallel: true, skill: false, fastTurns: false };
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, levers, sample))).toEqual([
      "turn 9000: Looking up all three booking pages in parallel.",
      "search(A Mano reservations) 4000 ok: found booking page for A Mano | search(II Borgo reservations) 4000 ok: found booking page for II Borgo | search(Doppio Zero reservations) 4000 ok: found booking page for Doppio Zero",
      "turn 9000: Trying all three availability forms in parallel.",
      `check_availability(A Mano) 5200 FAIL: ${FORM_REJECTED} | check_availability(II Borgo) 6000 FAIL: ${FORM_REJECTED} | check_availability(Doppio Zero) 4400 FAIL: ${FORM_REJECTED}`,
      "turn 9000: Forms want party_size and date. Retrying all three.",
      "check_availability(A Mano, 2, tonight) 5200 ok: no tables for 2 tonight | check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight | check_availability(Doppio Zero, 2, tonight) 4400 ok: available: 19:30",
      "turn 9000: Doppio Zero has 19:30. Booking it.",
      "book(Doppio Zero, 2, 19:30) 8000 FAIL: missing required fields: name",
      "turn 9000: Booking form wants name. Retrying with all fields.",
      "book(Doppio Zero, 2, 19:30, Sam Rivera) 8000 ok: confirmed DZ-1930-2",
      "turn 9000: Booked. Reporting back to the user.",
      "done(Booked Doppio Zero 19:30 for 2 · DZ-1930-2) 200 ok: reported to user",
    ]);
  });

  test("skill alone: no searches, no failed calls, still one restaurant at a time", () => {
    const levers = { parallel: false, skill: true, fastTurns: false };
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, levers, sample))).toEqual([
      "turn 9000: Skill book-dinner loaded. Checking A Mano first.",
      "check_availability(A Mano, 2, tonight) 5200 ok: no tables for 2 tonight",
      "turn 9000: A Mano is full. Checking II Borgo.",
      "check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight",
      "turn 9000: II Borgo is full. Checking Doppio Zero.",
      "check_availability(Doppio Zero, 2, tonight) 4400 ok: available: 19:30",
      "turn 9000: Doppio Zero has 19:30. Booking with the skill's fields.",
      "book(Doppio Zero, 2, 19:30, Sam Rivera) 8000 ok: confirmed DZ-1930-2",
      "turn 9000: Booked. Reporting back to the user.",
      "done(Booked Doppio Zero 19:30 for 2 · DZ-1930-2) 200 ok: reported to user",
    ]);
  });

  test("fast turns alone: the slow plan with 600 ms turns", () => {
    const steps = planRun(DEFAULT_GOAL, DEFAULT_WORLD, { parallel: false, skill: false, fastTurns: true }, sample);
    const s = sig(steps);
    expect(s.length).toBe(24);
    expect(s[0]).toBe("turn 600: Checking A Mano first. Looking up its booking page.");
    expect(s[22]).toBe("turn 600: Booked. Reporting back to the user.");
    expect(steps.filter((x) => x.kind === "turn").map((x) => x.durationMs)).toEqual(Array(12).fill(600));
  });
});

describe("planRun skill edits", () => {
  test("skill missing the name field: one failed book, then a retry", () => {
    const skill = parseSkill(SAMPLE_SKILL.replace("restaurant, party_size, time, name", "restaurant, party_size, time"));
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, FAST_LEVERS, skill)).slice(2)).toEqual([
      "turn 600: Doppio Zero has 19:30. Booking with the skill's fields.",
      "book(Doppio Zero, 2, 19:30) 8000 FAIL: missing required fields: name",
      "turn 600: Booking form wants name. Retrying with all fields.",
      "book(Doppio Zero, 2, 19:30, Sam Rivera) 8000 ok: confirmed DZ-1930-2",
      "turn 600: Booked. Reporting back to the user.",
      "done(Booked Doppio Zero 19:30 for 2 · DZ-1930-2) 200 ok: reported to user",
    ]);
  });

  test("skill without the word parallel forces sequential checks even with the lever on", () => {
    const skill = parseSkill(
      "# skill: one-by-one\n1. check_availability for each candidate (party_size, date=tonight)\n2. book with fields: restaurant, party_size, time, name",
    );
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, FAST_LEVERS, skill)).slice(0, 6)).toEqual([
      "turn 600: Skill one-by-one loaded. Checking A Mano first.",
      "check_availability(A Mano, 2, tonight) 5200 ok: no tables for 2 tonight",
      "turn 600: A Mano is full. Checking II Borgo.",
      "check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight",
      "turn 600: II Borgo is full. Checking Doppio Zero.",
      "check_availability(Doppio Zero, 2, tonight) 4400 ok: available: 19:30",
    ]);
  });

  test("an invalid skill does not count: the agent discovers the site", () => {
    const s = sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, FAST_LEVERS, parseSkill("no header")));
    expect(s.length).toBe(12);
    expect(s[0]).toBe("turn 600: Looking up all three booking pages in parallel.");
  });

  test("a null skill does not count either", () => {
    expect(sig(planRun(DEFAULT_GOAL, DEFAULT_WORLD, FAST_LEVERS, null))[0]).toBe(
      "turn 600: Looking up all three booking pages in parallel.",
    );
  });
});

describe("planRun worlds", () => {
  const early: World = {
    ...DEFAULT_WORLD,
    restaurants: [
      { name: "A Mano", slots: ["20:00", "18:45"], checkMs: 5200 },
      { name: "II Borgo", slots: [], checkMs: 6000 },
      { name: "Doppio Zero", slots: ["19:30"], checkMs: 4400 },
    ],
  };

  test("sequential stops at the first open restaurant and takes its earliest slot", () => {
    expect(sig(planRun(DEFAULT_GOAL, early, SLOW_LEVERS, null))).toEqual([
      "turn 9000: Checking A Mano first. Looking up its booking page.",
      "search(A Mano reservations) 4000 ok: found booking page for A Mano",
      "turn 9000: Found it. Trying A Mano's availability form.",
      `check_availability(A Mano) 5200 FAIL: ${FORM_REJECTED}`,
      "turn 9000: Form wants party_size and date. Retrying A Mano.",
      "check_availability(A Mano, 2, tonight) 5200 ok: available: 18:45, 20:00",
      "turn 9000: A Mano has 18:45. Booking it.",
      "book(A Mano, 2, 18:45) 8000 FAIL: missing required fields: name",
      "turn 9000: Booking form wants name. Retrying with all fields.",
      "book(A Mano, 2, 18:45, Sam Rivera) 8000 ok: confirmed AM-1845-2",
      "turn 9000: Booked. Reporting back to the user.",
      "done(Booked A Mano 18:45 for 2 · AM-1845-2) 200 ok: reported to user",
    ]);
  });

  test("parallel still checks every candidate, then books the first in goal order", () => {
    const s = sig(planRun(DEFAULT_GOAL, early, FAST_LEVERS, sample));
    expect(s[1]).toBe(
      "check_availability(A Mano, 2, tonight) 5200 ok: available: 18:45, 20:00 | check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight | check_availability(Doppio Zero, 2, tonight) 4400 ok: available: 19:30",
    );
    expect(s[3]).toBe("book(A Mano, 2, 18:45, Sam Rivera) 8000 ok: confirmed AM-1845-2");
  });

  test("no slots anywhere: no book call, done reports no booking", () => {
    const full: World = { ...DEFAULT_WORLD, restaurants: DEFAULT_WORLD.restaurants.map((r) => ({ ...r, slots: [] })) };
    const s = sig(planRun(DEFAULT_GOAL, full, FAST_LEVERS, sample));
    expect(s).toEqual([
      "turn 600: Skill book-dinner says check all three in parallel.",
      "check_availability(A Mano, 2, tonight) 5200 ok: no tables for 2 tonight | check_availability(II Borgo, 2, tonight) 6000 ok: no tables for 2 tonight | check_availability(Doppio Zero, 2, tonight) 4400 ok: no tables for 2 tonight",
      "turn 600: Nothing open tonight. Reporting back to the user.",
      "done(No booking · no tables tonight at A Mano, II Borgo, Doppio Zero) 200 ok: reported to user",
    ]);
  });

  test("goal without candidates goes straight to done", () => {
    expect(sig(planRun(parseGoal("Book dinner for 2"), DEFAULT_WORLD, SLOW_LEVERS, null))).toEqual([
      "turn 9000: Nothing open tonight. Reporting back to the user.",
      "done(No booking · no candidate restaurants in the goal) 200 ok: reported to user",
    ]);
  });

  test("party size flows into args, results and the code", () => {
    const s = sig(planRun(parseGoal("Dinner for 4 at one of: Doppio Zero"), DEFAULT_WORLD, FAST_LEVERS, sample));
    expect(s[1]).toBe("check_availability(Doppio Zero, 4, tonight) 4400 ok: available: 19:30");
    expect(s[3]).toBe("book(Doppio Zero, 4, 19:30, Sam Rivera) 8000 ok: confirmed DZ-1930-4");
  });
});
