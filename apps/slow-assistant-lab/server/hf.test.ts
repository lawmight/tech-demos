import { describe, expect, test } from "bun:test";
import { createHfHandler, type FetchLike } from "./hf";

const BODY = { goal: "Book dinner for 2", lastResult: "available: 19:30", fallback: "Booking it." };

function clock(...ticks: number[]): () => number {
  let i = 0;
  return () => ticks[Math.min(i++, ticks.length - 1)] ?? 0;
}

function completion(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("createHfHandler without a token", () => {
  const unreachable: FetchLike = () => Promise.reject(new Error("fetch must not be called"));
  const handler = createHfHandler({ env: {}, fetch: unreachable });

  test("status is disabled", async () => {
    expect(await handler.handle({ method: "GET", url: "/api/hf/status", body: undefined })).toEqual({
      status: 200,
      json: { enabled: false },
    });
  });

  test("turn explains the missing token", async () => {
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "HF_TOKEN not set" },
    });
  });

  test("other paths are not handled", async () => {
    expect(await handler.handle({ method: "GET", url: "/api/other", body: undefined })).toBe(null);
    expect(await handler.handle({ method: "GET", url: "/api/hf/turn", body: undefined })).toEqual({
      status: 405,
      json: { ok: false, error: "Use POST for /api/hf/turn" },
    });
  });
});

describe("createHfHandler with a token", () => {
  test("status reports the model but not the token", async () => {
    const handler = createHfHandler({ env: { HF_TOKEN: "hf_secret" }, fetch: () => Promise.resolve(completion("x")) });
    expect(await handler.handle({ method: "GET", url: "/api/hf/status?x=1", body: undefined })).toEqual({
      status: 200,
      json: { enabled: true, model: "Qwen/Qwen3-4B-Instruct-2507" },
    });
  });

  test("turn calls the router with bearer auth and returns the text and latency", async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const fetch: FetchLike = (url, init) => {
      seen.push({ url, init });
      return Promise.resolve(completion("  Booking Doppio Zero now. "));
    };
    const handler = createHfHandler({ env: { HF_TOKEN: "hf_secret", HF_MODEL: "tiny/model" }, fetch, now: clock(1000, 1250) });

    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: true, text: "Booking Doppio Zero now.", ms: 250 },
    });

    expect(seen.length).toBe(1);
    const call = seen[0];
    expect(call?.url).toBe("https://router.huggingface.co/v1/chat/completions");
    expect(call?.init.method).toBe("POST");
    expect(call?.init.headers).toEqual({ Authorization: "Bearer hf_secret", "Content-Type": "application/json" });
    expect(call?.init.signal instanceof AbortSignal).toBe(true);
    const sent: unknown = JSON.parse(String(call?.init.body));
    expect(sent).toEqual({
      model: "tiny/model",
      max_tokens: 48,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are the planner inside a personal assistant harness that books dinner. Speak as the agent, in first person, present tense.",
        },
        {
          role: "user",
          content:
            "Goal: Book dinner for 2\nLast tool result: available: 19:30\nDraft: Booking it.\nReply with ONE short sentence saying what you do next. No preamble.",
        },
      ],
    });
  });

  test("HTTP errors map to a clear message", async () => {
    const fetch: FetchLike = () =>
      Promise.resolve(new Response(JSON.stringify({ error: "Invalid credentials in Authorization header" }), { status: 401 }));
    const handler = createHfHandler({ env: { HF_TOKEN: "bad" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "Hugging Face returned 401: Invalid credentials in Authorization header" },
    });
  });

  test("non-JSON error bodies still map to a message", async () => {
    const fetch: FetchLike = () => Promise.resolve(new Response("Bad Gateway", { status: 502 }));
    const handler = createHfHandler({ env: { HF_TOKEN: "t" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "Hugging Face returned 502: Bad Gateway" },
    });
  });

  test("timeouts map to a timeout message", async () => {
    const fetch: FetchLike = () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"));
    const handler = createHfHandler({ env: { HF_TOKEN: "t" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "Hugging Face request timed out after 8s" },
    });
  });

  test("network failures map to a request-failed message", async () => {
    const fetch: FetchLike = () => Promise.reject(new TypeError("fetch failed"));
    const handler = createHfHandler({ env: { HF_TOKEN: "t" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "Hugging Face request failed: fetch failed" },
    });
  });

  test("malformed completions map to the parse error", async () => {
    const fetch: FetchLike = () => Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const handler = createHfHandler({ env: { HF_TOKEN: "t" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: BODY })).toEqual({
      status: 200,
      json: { ok: false, error: "Unexpected chat completion shape" },
    });
  });

  test("invalid request bodies are rejected before any fetch", async () => {
    const fetch: FetchLike = () => Promise.reject(new Error("fetch must not be called"));
    const handler = createHfHandler({ env: { HF_TOKEN: "t" }, fetch });
    expect(await handler.handle({ method: "POST", url: "/api/hf/turn", body: { goal: "g" } })).toEqual({
      status: 400,
      json: { ok: false, error: "Body must be { goal, lastResult, fallback } strings" },
    });
  });
});
