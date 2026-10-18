import type { JsonSchema } from "./types";

export const GROUNDING_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["boxes", "coordinate_space"],
  properties: {
    boxes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "box_2d", "confidence", "reasoning"],
        properties: {
          label: { type: "string" },
          box_2d: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number" },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
          order: { type: "string", enum: ["xyxy", "yxyx"] },
        },
      },
    },
    coordinate_space: {
      type: "string",
      enum: ["normalized_1000", "normalized_1", "pixels"],
    },
    notes: { type: "string" },
  },
};
