# Cache Warmth Lab

An offline timer for prompt-cache expiry. Replay one coding session across Anthropic / Claude Code, OpenAI / Codex, Cursor, and xAI / Grok. Each lane uses that provider's cache TTL, or it says `unknown` when the provider does not publish one.

This is a simulation. It does not call a provider API and it does not need an API key.

The idea comes from [@dani_avila7](https://x.com/dani_avila7/status/2106455605925822967) (2026-10-03), a Claude Code mod that shows a live bar for the 5-minute prompt cache and nudges before it goes cold. A reply on that post noted that cache reads can still count against rate limits. This lab answers that question per provider.

[harness-token-lab](https://github.com/lawmight/tech-demos/pull/4) covers how a cached prompt is laid out. This lab covers time.

## Run

From this directory:

```bash
bun install
bun run dev
```

Open the printed local URL. No environment variables are required.

`bun test` runs the TTL, cost, config, and import tests. `bun run typecheck` and `bun run build` check the TypeScript and the production bundle.

## What you see

The page opens on a sample session. Four turns sit close together, then one turn comes back after a seven-minute break. The clock starts at 6:40, inside that break, so the Anthropic 5-minute bar is nearly empty and the OpenAI 30-minute bar is still warm.

**Provider profiles.** Each card lists TTL, an extended TTL when one is published, the minimum cacheable prefix, cache mode, prices for one named model, write and read multipliers, and whether cache reads count toward rate limits. Every known value links to the page it came from. The config date is 2026-10-05. Type `unknown` or a number into **Edit numbers**. A number is kept only with an `https://` source. Edits stay in `localStorage`. **Reset to shipped defaults** drops them. **Add profile** starts a blank card.

**Replay.** **Play**, **Pause**, **Step**, and the scrubber share one clock. **1×** is real time. **10×** and **60×** compress it, so a 5-minute TTL can finish in seconds. **Default TTL** uses the shipped default. **Extended TTL** is available only when a selected profile publishes one. A lane with an unknown TTL shows the words `TTL unknown` and does not draw a bar.

**Nudge.** Set the lead time in seconds of simulated time. While a warm cache is inside that window, an in-page banner stays up. Press **Play** and the same moment fires a browser notification if you have allowed it. **Allow expiry alerts** asks for permission. If the browser refuses or has no Notification API, **Preview nudge** and the playback both use the on-page toast instead.

**Warm vs cold.** Warm is the cost of the turns up to the playhead, using cache reads and writes. Cold prices those same prompts with no cache. For the longest gap in the session, the table compares a keep-warm ping with paying a cache write after the break. The ping is modeled as a cache read of the prefix already cached, with no output tokens. Output tokens are the same on both paths, so the comparison leaves them out. Break-even is how many such pings cost the same as avoiding that rewrite. Unknown inputs stay `unknown`.

**Do cache reads count?** The answer is `yes`, `no`, `partial`, or `unknown`, with the source and a note. The token column is how many input tokens from the elapsed turns count under that rule.

## Provider numbers

Shipped values were checked against provider docs on 2026-10-05. They live in `src/config/providers.ts`. If a field had no official number, it ships as `unknown`.

| Profile | Model | Default TTL | Notes that change the demo |
| --- | --- | --- | --- |
| Anthropic / Claude Code | claude-sonnet-5-5 | 5 minutes | 1-hour extended TTL bills writes at 2×. Cache reads do not count toward ITPM for this model. |
| OpenAI / Codex | gpt-6.1-sol | 30 minutes | API cache reads are 0.05× and still count toward tokens per minute. The 7-minute break stays warm. |
| Cursor | composer-2.5 | unknown | Input, cache read, and output prices are published. TTL, minimum prefix, cache mode, write multiplier, and rate-limit treatment are not. |
| xAI / Grok | grok-4.7 | unknown | Caching is automatic. Docs say entries can be evicted at any time. Cached tokens still count toward TPM. |

Cursor Auto bills the model it routes to. This profile prices Composer 2.5 only.

## Import

Paste or upload. The page does not read `~/.claude` or `~/.codex`.

Claude Code JSONL. One JSON object per line. A turn is a row with `usage` on the object or on `message`. `input_tokens` is the uncached tail. The prompt size is that tail plus `cache_creation_input_tokens` plus `cache_read_input_tokens`.

Codex CLI session JSONL. Rows with `type: "event_msg"` and `payload.type: "token_count"`. `last_token_usage` is the turn. If it is missing, the turn is the difference from the previous `total_token_usage`. `turn_context.payload.model` names the model. Shape checked against the public ccusage Codex adapter notes, not against a private log.

Generic JSON. An array of `{ ts, provider?, model?, inputTokens, cachedInputTokens, cacheWriteTokens, outputTokens }`. `ts` is an ISO string or epoch milliseconds. `inputTokens` is the full prompt. The cached and cache-write fields are accepted and checked. They do not override the simulation. Cursor has no stable local transcript format in this app. Put a usage export into this array if you have one. The three **Load fixture** buttons use synthetic rows with no real paths or secrets.
