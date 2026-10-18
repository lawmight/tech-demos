import { describe, expect, test } from "bun:test";
import { fixtures } from "../src/fixtures/index";
import { scenes } from "../src/fixtures/scenes";
import { parseGrounding } from "../src/lib/parse";
import { findReplay } from "../src/lib/replay";

describe("replay fixtures", () => {
  test("covers every bundled question, including multi-box and no-match", () => {
    expect(scenes.length).toBeGreaterThanOrEqual(3);
    for (const scene of scenes) {
      expect(scene.questions.length).toBeGreaterThanOrEqual(2);
      for (const question of scene.questions) {
        const fixture = findReplay(fixtures, scene.id, question.query);
        expect(fixture?.id).toBe(question.id);
        expect(fixture?.source).toBe("synthetic");
        const outcome = parseGrounding(fixture?.rawResponse, { width: 1000, height: 1000 });
        expect(outcome.ok).toBe(true);
        if (!outcome.ok || !fixture) return;
        expect(outcome.result.boxes).toHaveLength(question.objectIds.length);
        expect(fixture.parsed.boxes).toHaveLength(question.objectIds.length);
      }
    }
    expect(findReplay(fixtures, "kitchen", "Where are the mugs?")?.parsed.boxes).toHaveLength(2);
    expect(findReplay(fixtures, "kitchen", "Where is the bicycle?")?.parsed.boxes).toEqual([]);
  });
});
