import { describe, expect, test } from "bun:test";
import { parseGrounding } from "../src/lib/parse";

const bounds = { width: 1000, height: 800 };

const sample = {
  boxes: [
    {
      label: "kettle",
      box_2d: [10, 20, 30, 40],
      confidence: 0.5,
      reasoning: "It has a spout.",
    },
  ],
  coordinate_space: "normalized_1000",
  notes: "one hit",
};

describe("parseGrounding", () => {
  test("passes label, confidence, and reasoning through", () => {
    const outcome = parseGrounding(sample, bounds);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes[0]).toEqual({
      label: "kettle",
      box_2d: [10, 20, 30, 40],
      confidence: 0.5,
      reasoning: "It has a spout.",
    });
    expect(outcome.result.notes).toBe("one hit");
  });

  test("reads fenced JSON", () => {
    const text = `\`\`\`json\n${JSON.stringify(sample)}\n\`\`\``;
    const outcome = parseGrounding(text, bounds);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes).toHaveLength(1);
  });

  test("reads bare JSON text", () => {
    const outcome = parseGrounding(JSON.stringify(sample), bounds);
    expect(outcome.ok).toBe(true);
  });

  test("returns an error result for malformed text", () => {
    const outcome = parseGrounding("not json at all", bounds);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toBe("The model reply was not valid JSON.");
  });

  test("accepts an empty box list", () => {
    const outcome = parseGrounding(
      { boxes: [], coordinate_space: "normalized_1000", notes: "none" },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes).toEqual([]);
  });

  test("clamps coordinates into range", () => {
    const outcome = parseGrounding(
      {
        boxes: [
          {
            label: "edge",
            box_2d: [-20, -5, 1200, 40],
            confidence: 0.4,
            reasoning: "Touches the border.",
          },
        ],
        coordinate_space: "normalized_1000",
      },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes[0]?.box_2d).toEqual([0, 0, 1000, 40]);
    expect(outcome.issues.some((issue) => issue.code === "clamped")).toBe(true);
  });

  test("clamps confidence into 0–1", () => {
    const outcome = parseGrounding(
      {
        boxes: [
          {
            label: "hot",
            box_2d: [1, 2, 3, 4],
            confidence: 1.4,
            reasoning: "Too sure.",
          },
        ],
        coordinate_space: "normalized_1000",
      },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes[0]?.confidence).toBe(1);
  });

  test("drops degenerate boxes", () => {
    const outcome = parseGrounding(
      {
        boxes: [
          {
            label: "flat",
            box_2d: [10, 10, 10, 40],
            confidence: 0.2,
            reasoning: "No area.",
          },
          {
            label: "kept",
            box_2d: [1, 2, 3, 4],
            confidence: 0.7,
            reasoning: "Has area.",
          },
        ],
        coordinate_space: "normalized_1000",
      },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes.map((box) => box.label)).toEqual(["kept"]);
    expect(outcome.issues.some((issue) => issue.code === "dropped")).toBe(true);
  });

  test("swaps yxyx only when flagged", () => {
    const outcome = parseGrounding(
      {
        boxes: [
          {
            label: "flagged",
            box_2d: [20, 10, 40, 30],
            confidence: 0.66,
            reasoning: "Stored y-first.",
            order: "yxyx",
          },
        ],
        coordinate_space: "normalized_1000",
      },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes[0]?.box_2d).toEqual([10, 20, 30, 40]);
    expect(outcome.result.boxes[0]?.order).toBe("yxyx");
  });

  test("parses a chat completion payload", () => {
    const outcome = parseGrounding(
      {
        choices: [{ message: { role: "assistant", content: JSON.stringify(sample) } }],
      },
      bounds,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.boxes[0]?.label).toBe("kettle");
  });
});
