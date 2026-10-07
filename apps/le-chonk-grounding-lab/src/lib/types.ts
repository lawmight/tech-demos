export type CoordinateSpace = "normalized_1000" | "normalized_1" | "pixels";

export type BoxOrder = "xyxy" | "yxyx";

export type GroundingBox = {
  label: string;
  box_2d: [number, number, number, number];
  confidence: number;
  reasoning: string;
  order?: BoxOrder;
};

export type GroundingResult = {
  boxes: GroundingBox[];
  coordinate_space: CoordinateSpace;
  notes?: string;
};

export type ParseIssue =
  | { code: "clamped"; index: number; detail: string }
  | { code: "dropped"; index: number; detail: string };

export type ParseSuccess = {
  ok: true;
  result: GroundingResult;
  issues: ParseIssue[];
};

export type ParseFailure = {
  ok: false;
  error: string;
  issues: ParseIssue[];
};

export type ParseOutcome = ParseSuccess | ParseFailure;

export type ImageSize = {
  width: number;
  height: number;
};

export type ProviderId = "vercel" | "mistral" | "openrouter";

export type JsonSchema = {
  [key: string]: unknown;
};

export type ReplayFixture = {
  id: string;
  provider: ProviderId;
  model: string;
  query: string;
  imageId: string;
  rawResponse: unknown;
  parsed: GroundingResult;
  recordedAt: string;
  source: "live" | "synthetic";
};

export const COORDINATE_SPACES = [
  "normalized_1000",
  "normalized_1",
  "pixels",
] as const satisfies readonly CoordinateSpace[];

export function isCoordinateSpace(value: unknown): value is CoordinateSpace {
  return (
    value === "normalized_1000" ||
    value === "normalized_1" ||
    value === "pixels"
  );
}

export function isProviderId(value: unknown): value is ProviderId {
  return value === "vercel" || value === "mistral" || value === "openrouter";
}
