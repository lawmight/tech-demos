import { describe, expect, test } from "bun:test";
import { DEFAULT_GOAL, DEFAULT_GOAL_TEXT, DEFAULT_WORLD, FAST_TURN_MS, SLOW_TURN_MS } from "./world";

describe("world", () => {
  test("default world has the three blog restaurants and only Doppio Zero has a slot", () => {
    expect(DEFAULT_WORLD).toEqual({
      restaurants: [
        { name: "A Mano", slots: [], checkMs: 5200 },
        { name: "II Borgo", slots: [], checkMs: 6000 },
        { name: "Doppio Zero", slots: ["19:30"], checkMs: 4400 },
      ],
      requiredBookFields: ["restaurant", "party_size", "time", "name"],
      durations: { searchMs: 4000, bookMs: 8000, doneMs: 200 },
    });
  });

  test("turn constants", () => {
    expect(SLOW_TURN_MS).toBe(9000);
    expect(FAST_TURN_MS).toBe(600);
  });

  test("default goal", () => {
    expect(DEFAULT_GOAL_TEXT).toBe("Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero");
    expect(DEFAULT_GOAL).toEqual({
      text: "Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero",
      partySize: 2,
      candidates: ["A Mano", "II Borgo", "Doppio Zero"],
    });
  });
});
