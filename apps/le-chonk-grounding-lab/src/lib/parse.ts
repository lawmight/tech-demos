import {
  isCoordinateSpace,
  type CoordinateSpace,
  type GroundingBox,
  type GroundingResult,
  type ImageSize,
  type ParseIssue,
  type ParseOutcome,
} from "./types";

export type ParseBounds = ImageSize;

const SPACE_MAX: Record<Exclude<CoordinateSpace, "pixels">, number> = {
  normalized_1000: 1000,
  normalized_1: 1,
};

export function extractJsonText(input: string): string {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

function sliceJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function extractMessageContent(payload: unknown): unknown {
  const root = asRecord(payload);
  if (!root) return payload;
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) return payload;
  const first = asRecord(choices[0]);
  const message = first ? asRecord(first.message) : null;
  if (!message) return payload;
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const part of content) {
      const record = asRecord(part);
      if (!record) continue;
      if (typeof record.text === "string") texts.push(record.text);
      if (record.json !== undefined) return record.json;
    }
    if (texts.length > 0) return texts.join("\n");
  }
  return content ?? payload;
}

function axisLimit(space: CoordinateSpace, bounds: ParseBounds, axis: "x" | "y"): number {
  if (space === "pixels") return axis === "x" ? bounds.width : bounds.height;
  return SPACE_MAX[space];
}

function clampPair(
  min: number,
  max: number,
  limit: number,
): { min: number; max: number; clamped: boolean } {
  const lo = Math.min(Math.max(min, 0), limit);
  const hi = Math.min(Math.max(max, 0), limit);
  return { min: lo, max: hi, clamped: lo !== min || hi !== max };
}

function parseBox(
  value: unknown,
  index: number,
  space: CoordinateSpace,
  bounds: ParseBounds,
  issues: ParseIssue[],
): GroundingBox | null {
  const record = asRecord(value);
  if (!record) {
    issues.push({ code: "dropped", index, detail: "Box was not an object." });
    return null;
  }
  const label = record.label;
  const reasoning = record.reasoning;
  const confidenceRaw = readNumber(record.confidence);
  const coords = record.box_2d;
  if (typeof label !== "string" || label.trim() === "") {
    issues.push({ code: "dropped", index, detail: "Box is missing a label." });
    return null;
  }
  if (typeof reasoning !== "string" || reasoning.trim() === "") {
    issues.push({ code: "dropped", index, detail: "Box is missing reasoning." });
    return null;
  }
  if (confidenceRaw === null) {
    issues.push({ code: "dropped", index, detail: "Box confidence is not a number." });
    return null;
  }
  if (!Array.isArray(coords) || coords.length !== 4) {
    issues.push({ code: "dropped", index, detail: "box_2d must be four numbers." });
    return null;
  }
  const numbers = coords.map((item) => readNumber(item));
  if (numbers.some((item) => item === null)) {
    issues.push({ code: "dropped", index, detail: "box_2d contains a non-number." });
    return null;
  }
  const [n0, n1, n2, n3] = numbers as [number, number, number, number];
  const flaggedYxyx = record.order === "yxyx";
  const xMin = flaggedYxyx ? n1 : n0;
  const yMin = flaggedYxyx ? n0 : n1;
  const xMax = flaggedYxyx ? n3 : n2;
  const yMax = flaggedYxyx ? n2 : n3;
  const xLimit = axisLimit(space, bounds, "x");
  const yLimit = axisLimit(space, bounds, "y");
  const x = clampPair(xMin, xMax, xLimit);
  const y = clampPair(yMin, yMax, yLimit);
  if (x.clamped || y.clamped) {
    issues.push({
      code: "clamped",
      index,
      detail: "Coordinates were clamped into the image.",
    });
  }
  if (x.max <= x.min || y.max <= y.min) {
    issues.push({
      code: "dropped",
      index,
      detail: "Box is degenerate after clamping.",
    });
    return null;
  }
  let confidence = confidenceRaw;
  if (confidence < 0 || confidence > 1) {
    confidence = Math.min(1, Math.max(0, confidence));
    issues.push({
      code: "clamped",
      index,
      detail: "Confidence was clamped to 0–1.",
    });
  }
  const box: GroundingBox = {
    label: label.trim(),
    box_2d: [x.min, y.min, x.max, y.max],
    confidence,
    reasoning: reasoning.trim(),
  };
  if (flaggedYxyx) box.order = "yxyx";
  return box;
}

export function parseGrounding(input: unknown, bounds: ParseBounds): ParseOutcome {
  const issues: ParseIssue[] = [];
  let value = input;
  if (typeof value === "string") {
    const text = sliceJsonObject(extractJsonText(value));
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false,
        error: "The model reply was not valid JSON.",
        issues,
      };
    }
  }
  value = extractMessageContent(value);
  if (typeof value === "string") {
    const text = sliceJsonObject(extractJsonText(value));
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      return {
        ok: false,
        error: "The model reply was not valid JSON.",
        issues,
      };
    }
  }
  const record = asRecord(value);
  if (!record) {
    return {
      ok: false,
      error: "Grounding JSON must be an object.",
      issues,
    };
  }
  if (!isCoordinateSpace(record.coordinate_space)) {
    return {
      ok: false,
      error: "coordinate_space must be normalized_1000, normalized_1, or pixels.",
      issues,
    };
  }
  if (!Array.isArray(record.boxes)) {
    return {
      ok: false,
      error: "boxes must be an array.",
      issues,
    };
  }
  const boxes: GroundingBox[] = [];
  record.boxes.forEach((item, index) => {
    const box = parseBox(item, index, record.coordinate_space as CoordinateSpace, bounds, issues);
    if (box) boxes.push(box);
  });
  const result: GroundingResult = {
    boxes,
    coordinate_space: record.coordinate_space,
  };
  if (typeof record.notes === "string" && record.notes.trim() !== "") {
    result.notes = record.notes.trim();
  }
  return { ok: true, result, issues };
}
