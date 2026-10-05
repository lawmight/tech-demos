export const codexFixture = [
  JSON.stringify({
    timestamp: "2026-10-05T16:00:00.000Z",
    type: "turn_context",
    payload: { model: "gpt-6.1-sol" },
  }),
  JSON.stringify({
    timestamp: "2026-10-05T16:00:20.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        last_token_usage: {
          input_tokens: 3_000,
          cached_input_tokens: 0,
          output_tokens: 400,
          reasoning_output_tokens: 50,
          total_tokens: 3_400,
        },
        total_token_usage: {
          input_tokens: 3_000,
          cached_input_tokens: 0,
          output_tokens: 400,
          reasoning_output_tokens: 50,
          total_tokens: 3_400,
        },
      },
    },
  }),
  JSON.stringify({
    timestamp: "2026-10-05T16:02:00.000Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 5_200,
          cached_input_tokens: 3_000,
          output_tokens: 700,
          total_tokens: 5_900,
        },
      },
    },
  }),
].join("\n");
