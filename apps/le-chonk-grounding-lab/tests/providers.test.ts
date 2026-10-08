import { describe, expect, test } from "bun:test";
import { mistralAdapter } from "../src/lib/providers/mistral";
import { openRouterAdapter } from "../src/lib/providers/openrouter";
import {
  DEFAULT_PROVIDER_ID,
  getProvider,
  providerRegistry,
  selectRunMode,
} from "../src/lib/providers/registry";
import { vercelAdapter } from "../src/lib/providers/vercel";
import type { ProviderAdapter } from "../src/lib/providers/types";
import { GROUNDING_SCHEMA } from "../src/lib/schema";
import { containsSecret } from "../src/lib/redact";

const KEY = "sk-test-SHOULD-NOT-LEAK";
const IMAGE = "data:image/png;base64,aaaa";

const raw = {
  choices: [
    {
      message: {
        role: "assistant",
        content: JSON.stringify({
          boxes: [
            {
              label: "kettle",
              box_2d: [90, 330, 340, 640],
              confidence: 0.93,
              reasoning: "Dark body and spout on the left.",
            },
          ],
          coordinate_space: "normalized_1000",
        }),
      },
    },
  ],
};

function expectRequest(adapter: ProviderAdapter, model: string): void {
  const built = adapter.buildRequest({
    apiKey: KEY,
    imageDataUrl: IMAGE,
    query: "Where is the kettle?",
    model,
    schema: GROUNDING_SCHEMA,
  });
  expect(built.method).toBe("POST");
  expect(built.url).toBe(adapter.endpoint);
  expect(built.headers.Authorization).toBe(`Bearer ${KEY}`);
  expect(built.body.model).toBe(model);
  expect(built.body.response_format.type).toBe("json_schema");
  expect(built.body.response_format.json_schema.schema).toEqual(GROUNDING_SCHEMA);
  expect(built.body.messages[0]?.content[1]).toEqual({
    type: "image_url",
    image_url: { url: IMAGE },
  });
  expect(containsSecret(built.body, KEY)).toBe(false);
  const outcome = adapter.parseResponse(raw, { width: 1000, height: 1000 });
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  expect(outcome.result.boxes[0]?.label).toBe("kettle");
  expect(outcome.result.boxes[0]?.confidence).toBe(0.93);
}

describe("provider adapters", () => {
  test("Vercel AI Gateway", () => {
    expect(vercelAdapter.defaultModel).toBe("mistral/mistral-large-4");
    expect(vercelAdapter.envKey).toBe("AI_GATEWAY_API_KEY");
    expectRequest(vercelAdapter, "mistral/mistral-large-4");
  });

  test("Mistral API", () => {
    expect(mistralAdapter.defaultModel).toBe("mistral-large-4");
    expect(mistralAdapter.envKey).toBe("MISTRAL_API_KEY");
    expectRequest(mistralAdapter, "mistral-large-4");
  });

  test("OpenRouter", () => {
    expect(openRouterAdapter.defaultModel).toBe("mistralai/mistral-large-4-0");
    expect(openRouterAdapter.envKey).toBe("OPENROUTER_API_KEY");
    expect(openRouterAdapter.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    const built = openRouterAdapter.buildRequest({
      apiKey: KEY,
      imageDataUrl: IMAGE,
      query: "Where is the kettle?",
      model: openRouterAdapter.defaultModel,
      schema: GROUNDING_SCHEMA,
    });
    expect(built.headers["HTTP-Referer"]).toBe("http://localhost:5173");
    expect(built.headers["X-Title"]).toBe("Le Chonk Grounding Lab");
    expectRequest(openRouterAdapter, "mistralai/mistral-large-4-0");
  });
});

describe("provider registry", () => {
  test("defaults to Vercel and falls back to replay without a key", () => {
    expect(DEFAULT_PROVIDER_ID).toBe("vercel");
    expect(getProvider("vercel")?.id).toBe("vercel");
    expect(providerRegistry.map((item) => item.id)).toEqual([
      "vercel",
      "mistral",
      "openrouter",
    ]);
    expect(selectRunMode({ requested: "live", hasKey: false })).toBe("replay");
    expect(selectRunMode({ requested: "live", hasKey: true })).toBe("live");
    expect(selectRunMode({ requested: "replay", hasKey: true })).toBe("replay");
  });
});
