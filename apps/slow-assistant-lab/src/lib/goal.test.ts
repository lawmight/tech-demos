import { describe, expect, test } from "bun:test";
import { lookupRestaurant, parseGoal } from "./goal";
import { DEFAULT_WORLD } from "./world";

describe("parseGoal", () => {
  test("default goal text", () => {
    expect(parseGoal("Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero")).toEqual({
      text: "Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero",
      partySize: 2,
      candidates: ["A Mano", "II Borgo", "Doppio Zero"],
    });
  });

  test("party size and ' or ' separator, trailing period dropped", () => {
    expect(parseGoal("Table for 4 at one of: A Mano or Doppio Zero.")).toEqual({
      text: "Table for 4 at one of: A Mano or Doppio Zero.",
      partySize: 4,
      candidates: ["A Mano", "Doppio Zero"],
    });
  });

  test("mixed comma and ', or' list, default party size", () => {
    expect(parseGoal("dinner tonight, one of:  A Mano,II Borgo , or Doppio Zero").candidates).toEqual([
      "A Mano",
      "II Borgo",
      "Doppio Zero",
    ]);
    expect(parseGoal("dinner tonight, one of: A Mano").partySize).toBe(2);
  });

  test("no 'one of:' means no candidates", () => {
    expect(parseGoal("Book dinner for 3")).toEqual({ text: "Book dinner for 3", partySize: 3, candidates: [] });
  });
});

describe("lookupRestaurant", () => {
  test("case-insensitive match returns the world record", () => {
    expect(lookupRestaurant(DEFAULT_WORLD, "doppio zero")).toEqual({
      name: "Doppio Zero",
      slots: ["19:30"],
      checkMs: 4400,
    });
  });

  test("unknown name falls back to a full restaurant with a 5000 ms check", () => {
    expect(lookupRestaurant(DEFAULT_WORLD, "Nopa")).toEqual({ name: "Nopa", slots: [], checkMs: 5000 });
  });
});
