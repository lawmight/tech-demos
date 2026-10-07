import { GROUNDING_SCHEMA } from "./schema";
import { containsSecret, redactSecret } from "./redact";
import { getProvider } from "./providers/registry";
import { isProviderId, type ProviderId } from "./types";

export type ProxyEnv = Record<string, string | undefined>;

export type ProxyResult = {
  status: number;
  json: Record<string, unknown>;
};

const MAX_BODY_CHARS = 8_000_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPositive(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function keyStatus(env: ProxyEnv): Record<ProviderId, boolean> {
  return {
    vercel: Boolean(env.AI_GATEWAY_API_KEY),
    mistral: Boolean(env.MISTRAL_API_KEY),
    openrouter: Boolean(env.OPENROUTER_API_KEY),
  };
}

function fail(status: number, error: string): ProxyResult {
  return { status, json: { ok: false, error } };
}

export async function handleGroundRequest(
  body: unknown,
  options: { env: ProxyEnv; fetchImpl: typeof fetch },
): Promise<ProxyResult> {
  const record = asRecord(body);
  if (!record) return fail(400, "Request body must be a JSON object.");
  if (!isProviderId(record.providerId)) {
    return fail(400, "Unknown provider.");
  }
  const adapter = getProvider(record.providerId);
  if (!adapter) return fail(400, "Unknown provider.");
  if (typeof record.query !== "string" || record.query.trim() === "") {
    return fail(400, "Query is required.");
  }
  if (typeof record.imageDataUrl !== "string" || !record.imageDataUrl.startsWith("data:image/")) {
    return fail(400, "imageDataUrl must be an image data URL.");
  }
  if (record.imageDataUrl.length > MAX_BODY_CHARS) {
    return fail(413, "Image is too large to send.");
  }
  const width = readPositive(record.imageWidth);
  const height = readPositive(record.imageHeight);
  if (width === null || height === null) {
    return fail(400, "imageWidth and imageHeight are required.");
  }
  const model =
    typeof record.model === "string" && record.model.trim() !== ""
      ? record.model.trim()
      : adapter.defaultModel;
  const inlineKey = typeof record.apiKey === "string" ? record.apiKey.trim() : "";
  const apiKey = inlineKey || options.env[adapter.envKey] || "";
  if (!apiKey) {
    return fail(400, "Live mode needs an API key for this provider.");
  }
  const built = adapter.buildRequest({
    apiKey,
    imageDataUrl: record.imageDataUrl,
    query: record.query.trim(),
    model,
    schema: GROUNDING_SCHEMA,
  });
  if (containsSecret(built.body, apiKey)) {
    return fail(500, "Refusing to send a request that includes the key in the body.");
  }
  let upstream: Response;
  try {
    upstream = await options.fetchImpl(built.url, {
      method: built.method,
      headers: built.headers,
      body: JSON.stringify(built.body),
    });
  } catch {
    return fail(502, "The provider request failed.");
  }
  const text = await upstream.text();
  let parsedJson: unknown = text;
  try {
    parsedJson = JSON.parse(text) as unknown;
  } catch {
    parsedJson = { raw: text };
  }
  const safeRaw = redactSecret(parsedJson, apiKey);
  if (!upstream.ok) {
    return {
      status: 502,
      json: {
        ok: false,
        error: `Provider returned ${upstream.status}.`,
        providerId: adapter.id,
        model,
        raw: safeRaw,
      },
    };
  }
  const outcome = adapter.parseResponse(parsedJson, { width, height });
  const safeOutcome = redactSecret(outcome, apiKey);
  return {
    status: 200,
    json: {
      ok: outcome.ok,
      providerId: adapter.id,
      model,
      outcome: safeOutcome,
      raw: safeRaw,
    },
  };
}
