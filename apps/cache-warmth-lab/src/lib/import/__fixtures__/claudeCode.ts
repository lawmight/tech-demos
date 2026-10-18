export const claudeCodeFixture = [
  JSON.stringify({
    timestamp: "2026-10-05T15:00:00.000Z",
    message: {
      role: "assistant",
      model: "claude-sonnet-5-5",
      usage: {
        input_tokens: 400,
        cache_creation_input_tokens: 8_000,
        cache_read_input_tokens: 0,
        output_tokens: 220,
      },
    },
  }),
  JSON.stringify({
    timestamp: "2026-10-05T15:01:00.000Z",
    message: {
      role: "assistant",
      model: "claude-sonnet-5-5",
      usage: {
        input_tokens: 180,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 8_400,
        output_tokens: 90,
      },
    },
  }),
  "not json",
  "",
].join("\n");
