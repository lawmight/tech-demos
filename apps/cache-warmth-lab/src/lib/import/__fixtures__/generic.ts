export const genericFixture = JSON.stringify([
  {
    ts: "2026-10-05T17:00:00.000Z",
    provider: "cursor",
    model: "composer-2.5",
    inputTokens: 4_200,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 300,
  },
  {
    ts: "2026-10-05T17:01:00.000Z",
    provider: "cursor",
    model: "composer-2.5",
    inputTokens: 5_000,
    cachedInputTokens: 4_200,
    cacheWriteTokens: 800,
    outputTokens: 120,
  },
]);
