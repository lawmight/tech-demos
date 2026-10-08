import type { Field, ProviderProfile } from "../lib/types";

export const AS_OF = "2026-10-05";

const ANTHROPIC_PRICING = "https://platform.claude.com/docs/en/about-claude/pricing";
const ANTHROPIC_CACHE = "https://platform.claude.com/docs/en/build-with-claude/prompt-caching";
const ANTHROPIC_LIMITS = "https://platform.claude.com/docs/en/api/rate-limits";
const CLAUDE_CODE_CACHE = "https://code.claude.com/docs/en/prompt-caching";
const OPENAI_CACHE = "https://developers.openai.com/api/docs/guides/prompt-caching";
const OPENAI_SOL = "https://developers.openai.com/api/docs/models/gpt-6.1-sol";
const CODEX_PRICING = "https://developers.openai.com/codex/pricing";
const XAI_CACHE = "https://docs.x.ai/developers/advanced-api-usage/prompt-caching";
const XAI_HOW = "https://docs.x.ai/developers/advanced-api-usage/prompt-caching/how-it-works";
const XAI_USAGE = "https://docs.x.ai/developers/advanced-api-usage/prompt-caching/usage-and-pricing";
const XAI_FAQ = "https://docs.x.ai/developers/advanced-api-usage/prompt-caching/best-practices";
const XAI_PRICE = "https://docs.x.ai/developers/pricing";
const XAI_LIMITS = "https://docs.x.ai/developers/rate-limits";
const CURSOR_PRICE = "https://cursor.com/docs/models-and-pricing";

function known<T>(value: T, source: string): Field<T> {
  return { kind: "known", value, source };
}

function unknown<T>(source: string | null = null): Field<T> {
  return { kind: "unknown", source };
}

export const shippedProfiles: ProviderProfile[] = [
  {
    id: "anthropic",
    label: "Anthropic / Claude Code",
    model: "claude-sonnet-5-5",
    asOf: AS_OF,
    ttlSeconds: known(300, CLAUDE_CODE_CACHE),
    extendedTtlSeconds: known(3600, ANTHROPIC_PRICING),
    minCacheablePrefixTokens: known(512, ANTHROPIC_CACHE),
    cacheMode: known("explicit", CLAUDE_CODE_CACHE),
    inputUsdPerMillion: known(2, ANTHROPIC_PRICING),
    outputUsdPerMillion: known(10, ANTHROPIC_PRICING),
    cacheWriteMultiplier: known(1.25, ANTHROPIC_PRICING),
    extendedCacheWriteMultiplier: known(2, ANTHROPIC_PRICING),
    cacheReadMultiplier: known(0.1, ANTHROPIC_PRICING),
    readsCountTowardRateLimit: {
      value: "no",
      source: ANTHROPIC_LIMITS,
      note: "For Sonnet 5.5, cache_read_input_tokens do not count toward ITPM. Cache writes do. Haiku 3.5 is the documented exception that does count cache reads.",
    },
    notes:
      "Default TTL here is the five-minute bucket Claude Code uses for API-key, usage-credit, and over-limit billing. On a Claude subscription inside included usage, the main conversation requests the one-hour TTL instead. A read refreshes the cache with no extra write charge. The Messages API also offers top-level automatic cache_control.",
  },
  {
    id: "openai",
    label: "OpenAI / Codex",
    model: "gpt-6.1-sol",
    asOf: AS_OF,
    ttlSeconds: known(1800, OPENAI_CACHE),
    extendedTtlSeconds: unknown(OPENAI_CACHE),
    minCacheablePrefixTokens: known(1024, OPENAI_CACHE),
    cacheMode: known("automatic", OPENAI_CACHE),
    inputUsdPerMillion: known(2, OPENAI_SOL),
    outputUsdPerMillion: known(10, OPENAI_SOL),
    cacheWriteMultiplier: known(1.25, OPENAI_SOL),
    extendedCacheWriteMultiplier: unknown(OPENAI_CACHE),
    cacheReadMultiplier: known(0.05, OPENAI_SOL),
    readsCountTowardRateLimit: {
      value: "yes",
      source: OPENAI_CACHE,
      note: "Cached input tokens still count toward API tokens-per-minute limits. Codex credit plans bill cached input at a lower credit rate, so those tokens still consume the allowance.",
    },
    notes:
      "Prices are API rates for gpt-6.1-sol, the model named on the Codex Plus plan. GPT-5.6 and later document a single 30-minute TTL (prompt_cache_options.ttl = 30m). Implicit caching is the default; explicit breakpoints also exist. Codex credit billing has no separate cache-write charge; API cache writes are 1.25×. See also " +
      CODEX_PRICING +
      ".",
  },
  {
    id: "cursor",
    label: "Cursor",
    model: "composer-2.5",
    asOf: AS_OF,
    ttlSeconds: unknown(CURSOR_PRICE),
    extendedTtlSeconds: unknown(CURSOR_PRICE),
    minCacheablePrefixTokens: unknown(CURSOR_PRICE),
    cacheMode: unknown(CURSOR_PRICE),
    inputUsdPerMillion: known(0.5, CURSOR_PRICE),
    outputUsdPerMillion: known(2.5, CURSOR_PRICE),
    cacheWriteMultiplier: unknown(CURSOR_PRICE),
    extendedCacheWriteMultiplier: unknown(CURSOR_PRICE),
    cacheReadMultiplier: known(0.4, CURSOR_PRICE),
    readsCountTowardRateLimit: {
      value: "unknown",
      source: CURSOR_PRICE,
      note: "Composer 2.5 publishes a cache-read price, so reads are billed. The docs do not say whether those tokens are excluded from a rate limit.",
    },
    notes:
      "Cursor does not publish a cache TTL. This row prices first-party Composer 2.5 from the models table (Input $0.50, Cache Write —, Cache Read $0.20, Output $2.50 per 1M). The read multiplier is 0.20/0.50. The write column is a dash, so the write multiplier is unknown. Auto bills whichever model's list price it routes to. Depends on the underlying model for routing that is not Composer 2.5.",
  },
  {
    id: "xai",
    label: "xAI / Grok",
    model: "grok-4.7",
    asOf: AS_OF,
    ttlSeconds: unknown(XAI_FAQ),
    extendedTtlSeconds: unknown(XAI_FAQ),
    minCacheablePrefixTokens: unknown(XAI_HOW),
    cacheMode: known("automatic", XAI_CACHE),
    inputUsdPerMillion: known(2, XAI_PRICE),
    outputUsdPerMillion: known(6, XAI_PRICE),
    cacheWriteMultiplier: known(1, XAI_USAGE),
    extendedCacheWriteMultiplier: unknown(XAI_USAGE),
    cacheReadMultiplier: known(0.25, XAI_PRICE),
    readsCountTowardRateLimit: {
      value: "yes",
      source: XAI_LIMITS,
      note: "Cached prompt tokens still count toward tokens per minute, and they are billed at the reduced cached rate.",
    },
    notes:
      "Caching is automatic from the start of the messages array. Docs say entries can be evicted at any time and do not publish a TTL or a minimum cacheable length. No separate cache-write price is listed; uncached prompt tokens bill at the input price (multiplier 1). Prices are grok-4.7 short context, under 200k tokens: input $2, cached input $0.50, output $6 per 1M.",
  },
];

export function blankProfile(id: string): ProviderProfile {
  return {
    id,
    label: "Custom profile",
    model: "unknown",
    asOf: AS_OF,
    ttlSeconds: unknown(null),
    extendedTtlSeconds: unknown(null),
    minCacheablePrefixTokens: unknown(null),
    cacheMode: unknown(null),
    inputUsdPerMillion: unknown(null),
    outputUsdPerMillion: unknown(null),
    cacheWriteMultiplier: unknown(null),
    extendedCacheWriteMultiplier: unknown(null),
    cacheReadMultiplier: unknown(null),
    readsCountTowardRateLimit: {
      value: "unknown",
      source: null,
      note: "No official source yet.",
    },
    notes: "User-added profile. Fill unknown fields from a source you trust.",
  };
}
