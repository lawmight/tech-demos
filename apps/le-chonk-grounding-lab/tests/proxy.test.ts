import { describe, expect, test } from "bun:test";
import { handleGroundRequest } from "../src/lib/proxy";

const KEY = "sk-test-SHOULD-NOT-LEAK";

const raw = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          boxes: [],
          coordinate_space: "normalized_1000",
          notes: "no match",
        }),
      },
    },
  ],
};

describe("ground proxy", () => {
  test("forwards the bearer token and never echoes the key", async () => {
    let seenAuth = "";
    let seenBody = "";
    const fetchImpl: typeof fetch = async (_url, init) => {
      const headers = new Headers(init?.headers);
      seenAuth = headers.get("Authorization") ?? "";
      seenBody = typeof init?.body === "string" ? init.body : "";
      return new Response(JSON.stringify(raw), { status: 200 });
    };
    const result = await handleGroundRequest(
      {
        providerId: "vercel",
        query: "Where is the bicycle?",
        imageDataUrl: "data:image/png;base64,aaaa",
        imageWidth: 1000,
        imageHeight: 1000,
        apiKey: KEY,
      },
      { env: {}, fetchImpl },
    );
    expect(seenAuth).toBe(`Bearer ${KEY}`);
    expect(seenBody.includes(KEY)).toBe(false);
    expect(result.status).toBe(200);
    expect(JSON.stringify(result.json).includes(KEY)).toBe(false);
    expect(result.json.ok).toBe(true);
  });

  test("reads the env key without returning it", async () => {
    let seenAuth = "";
    const fetchImpl: typeof fetch = async (_url, init) => {
      seenAuth = new Headers(init?.headers).get("Authorization") ?? "";
      return new Response(JSON.stringify(raw), { status: 200 });
    };
    const result = await handleGroundRequest(
      {
        providerId: "mistral",
        model: "mistral-large-4",
        query: "Where is the kettle?",
        imageDataUrl: "data:image/png;base64,aaaa",
        imageWidth: 800,
        imageHeight: 600,
      },
      { env: { MISTRAL_API_KEY: KEY }, fetchImpl },
    );
    expect(seenAuth).toBe(`Bearer ${KEY}`);
    expect(JSON.stringify(result.json).includes(KEY)).toBe(false);
  });

  test("does not call the network when no key is set", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    const result = await handleGroundRequest(
      {
        providerId: "openrouter",
        query: "Where is the dog?",
        imageDataUrl: "data:image/png;base64,aaaa",
        imageWidth: 1000,
        imageHeight: 1000,
      },
      { env: {}, fetchImpl },
    );
    expect(called).toBe(false);
    expect(result.status).toBe(400);
    expect(result.json.ok).toBe(false);
  });
});
