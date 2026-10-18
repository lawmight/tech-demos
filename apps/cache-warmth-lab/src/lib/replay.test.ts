import { describe, expect, test } from "bun:test";
import { shippedProfiles } from "../config/providers";
import { sampleSession } from "./sample";
import { replay, shouldNudge } from "./replay";

const end = sampleSession.turns.at(-1)?.atMs ?? 0;

describe("ttl state", () => {
  test("anthropic refills on each hit and goes cold across the seven-minute break", () => {
    const anthropic = shippedProfiles[0];
    if (!anthropic) throw new Error("missing anthropic");
    const during = replay(sampleSession, anthropic, 200_000, "default");
    expect(during.warmth).toEqual({ status: "warm", remainingMs: 220_000, ttlMs: 300_000 });
    expect(during.turns.map((turn) => turn.marker)).toEqual(["write", "hit", "hit", "hit"]);
    const afterBreak = replay(sampleSession, anthropic, end, "default");
    expect(afterBreak.turns.map((turn) => turn.marker)).toEqual(["write", "hit", "hit", "hit", "write"]);
    expect(afterBreak.warmth.status).toBe("warm");
    const cold = replay(sampleSession, anthropic, 120_000 + 300_000, "default");
    expect(cold.warmth).toEqual({ status: "cold", remainingMs: 0, ttlMs: 300_000 });
    expect(shouldNudge(during.warmth, 30_000)).toBe(false);
    const almost = replay(sampleSession, anthropic, 120_000 + 280_000, "default");
    expect(shouldNudge(almost.warmth, 30_000)).toBe(true);
  });

  test("openai 30-minute ttl stays warm through the same break", () => {
    const openai = shippedProfiles[1];
    if (!openai) throw new Error("missing openai");
    const result = replay(sampleSession, openai, end, "default");
    expect(result.turns.map((turn) => turn.marker)).toEqual(["write", "hit", "hit", "hit", "hit"]);
    expect(result.gap?.insideTtl).toBe(true);
    expect(result.gap?.pingsNeeded).toBe(0);
  });

  test("unknown ttl does not invent a bar", () => {
    const cursor = shippedProfiles[2];
    if (!cursor) throw new Error("missing cursor");
    const result = replay(sampleSession, cursor, end, "default");
    expect(result.warmth.status).toBe("unknown");
    expect(result.turns.every((turn) => turn.marker === "unknown")).toBe(true);
    expect(result.warm.status).toBe("unknown");
  });
});

describe("cost and ping math", () => {
  test("anthropic warm total, cold total, and one-ping break-even", () => {
    const anthropic = shippedProfiles[0];
    if (!anthropic) throw new Error("missing anthropic");
    const result = replay(sampleSession, anthropic, end, "default");
    expect(result.warm).toEqual({ status: "known", microUsd: 106_720 });
    expect(result.cold).toEqual({ status: "known", microUsd: 145_000 });
    expect(result.gap?.pingsNeeded).toBe(1);
    expect(result.gap?.insideTtl).toBe(false);
    expect(result.gap?.pingPath).toEqual({ status: "known", microUsd: 8_960 });
    expect(result.gap?.rewritePath).toEqual({ status: "known", microUsd: 35_000 });
    expect(result.gap?.breakEvenPings).toBe(11.5);
  });

  test("extended one-hour ttl keeps the seven-minute gap warm", () => {
    const anthropic = shippedProfiles[0];
    if (!anthropic) throw new Error("missing anthropic");
    const result = replay(sampleSession, anthropic, end, "extended");
    expect(result.turns.at(-1)?.marker).toBe("hit");
    expect(result.gap?.pingsNeeded).toBe(0);
    expect(result.warm).toEqual({ status: "known", microUsd: 99_200 });
  });
});

describe("rate limit accounting", () => {
  test("anthropic excludes cache reads and openai includes them", () => {
    const anthropic = shippedProfiles[0];
    const openai = shippedProfiles[1];
    if (!anthropic || !openai) throw new Error("missing profile");
    const anthropicReplay = replay(sampleSession, anthropic, end, "default");
    const openaiReplay = replay(sampleSession, openai, end, "default");
    expect(anthropicReplay.tokensAgainstLimit).toEqual({ status: "known", tokens: 26_400 });
    expect(openaiReplay.tokensAgainstLimit).toEqual({ status: "known", tokens: 55_000 });
  });

  test("cursor rate-limit answer stays unknown", () => {
    const cursor = shippedProfiles[2];
    if (!cursor) throw new Error("missing cursor");
    const result = replay(sampleSession, cursor, end, "default");
    expect(cursor.readsCountTowardRateLimit.value).toBe("unknown");
    expect(result.tokensAgainstLimit.status).toBe("unknown");
  });
});
