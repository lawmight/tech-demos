import { describe, expect, test } from "bun:test";
import { SAMPLE_SKILL, parseSkill } from "./skill";

describe("parseSkill", () => {
  test("sample skill parses", () => {
    expect(parseSkill(SAMPLE_SKILL)).toEqual({
      ok: true,
      skill: {
        name: "book-dinner",
        steps: [
          "check_availability for every candidate in parallel (party_size, date=tonight)",
          "pick the earliest slot between 18:30 and 21:00",
          "book with fields: restaurant, party_size, time, name",
          "done with the confirmation code",
        ],
        parallel: true,
        bookFields: ["restaurant", "party_size", "time", "name"],
      },
    });
  });

  test("no parallel word and no book fields", () => {
    expect(parseSkill("#skill:  one-by-one \n1) check each restaurant in turn\n2. book the first open one")).toEqual({
      ok: true,
      skill: {
        name: "one-by-one",
        steps: ["check each restaurant in turn", "book the first open one"],
        parallel: false,
        bookFields: [],
      },
    });
  });

  test("parallel is case-insensitive", () => {
    const parsed = parseSkill("# skill: x\n1. check all in PARALLEL");
    expect(parsed).toEqual({
      ok: true,
      skill: { name: "x", steps: ["check all in PARALLEL"], parallel: true, bookFields: [] },
    });
  });

  test("missing header is an error value", () => {
    expect(parseSkill("1. check availability")).toEqual({
      ok: false,
      error: "Missing '# skill: <name>' header",
    });
  });

  test("no numbered steps is an error value", () => {
    expect(parseSkill("# skill: empty\nsteps:\n- not numbered")).toEqual({
      ok: false,
      error: "Skill needs at least one numbered step",
    });
  });
});
