import { groundingPrompt } from "../prompt";
import { parseGrounding } from "../parse";
import type { ImageSize, ParseOutcome } from "../types";
import type { BuildRequestInput, ChatRequestBody } from "./types";

export function chatBody(input: BuildRequestInput): ChatRequestBody {
  return {
    model: input.model,
    temperature: 0,
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: groundingPrompt(input.query) },
          { type: "image_url", image_url: { url: input.imageDataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "visual_grounding",
        strict: true,
        schema: input.schema,
      },
    },
  };
}

export function bearer(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

export function parseChatResponse(json: unknown, bounds: ImageSize): ParseOutcome {
  return parseGrounding(json, bounds);
}
