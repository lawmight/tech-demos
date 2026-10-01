import { describe, expect, test } from "bun:test";
import { confirmationCode, deriveOutcome, describeOutcome } from "./outcome";
import type { Step } from "./types";

const goal = { text: "g", partySize: 2, candidates: ["A Mano", "Doppio Zero"] };

describe("confirmationCode", () => {
  test("initials-time-partySize", () => {
    expect(confirmationCode("Doppio Zero", "19:30", 2)).toBe("DZ-1930-2");
    expect(confirmationCode("II Borgo", "18:45", 4)).toBe("IB-1845-4");
  });
});

describe("deriveOutcome", () => {
  test("a successful book call wins over a failed one", () => {
    const steps: Step[] = [
      {
        kind: "tools",
        calls: [
          {
            tool: "book",
            args: { restaurant: "Doppio Zero", party_size: "2", time: "19:30" },
            ok: false,
            result: "missing required fields: name",
            durationMs: 8000,
          },
        ],
      },
      { kind: "turn", text: "retry", durationMs: 600 },
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
    ];
    expect(deriveOutcome(goal, steps)).toEqual({
      booked: true,
      restaurant: "Doppio Zero",
      time: "19:30",
      code: "DZ-1930-2",
    });
  });

  test("no successful book lists the candidates", () => {
    expect(deriveOutcome(goal, [])).toEqual({ booked: false, reason: "no tables tonight at A Mano, Doppio Zero" });
  });

  test("no candidates", () => {
    expect(deriveOutcome({ text: "", partySize: 2, candidates: [] }, [])).toEqual({
      booked: false,
      reason: "no candidate restaurants in the goal",
    });
  });
});

describe("describeOutcome", () => {
  test("booked and not booked", () => {
    expect(describeOutcome({ booked: true, restaurant: "Doppio Zero", time: "19:30", code: "DZ-1930-2" }, 2)).toBe(
      "Booked Doppio Zero 19:30 for 2 · DZ-1930-2",
    );
    expect(describeOutcome({ booked: false, reason: "no tables tonight at A Mano" }, 2)).toBe(
      "No booking · no tables tonight at A Mano",
    );
  });
});
