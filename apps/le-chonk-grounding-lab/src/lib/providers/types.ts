import type { ImageSize, ParseOutcome, ProviderId } from "../types";
import type { GROUNDING_SCHEMA } from "../schema";

export type GroundingSchema = typeof GROUNDING_SCHEMA;

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatRequestBody = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{
    role: "user";
    content: ChatContentPart[];
  }>;
  response_format: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: GroundingSchema;
    };
  };
};

export type BuiltRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: ChatRequestBody;
};

export type BuildRequestInput = {
  apiKey: string;
  imageDataUrl: string;
  query: string;
  model: string;
  schema: GroundingSchema;
};

export type ProviderAdapter = {
  id: ProviderId;
  label: string;
  defaultModel: string;
  envKey: string;
  endpoint: string;
  buildRequest: (input: BuildRequestInput) => BuiltRequest;
  parseResponse: (json: unknown, bounds: ImageSize) => ParseOutcome;
};
