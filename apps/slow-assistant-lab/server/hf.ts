import type { IncomingMessage, ServerResponse } from "node:http";
import { buildTurnPrompt, hfConfig, parseChatCompletion, type TurnInput } from "../src/lib/hf";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type HfRequest = { method: string; url: string; body: unknown };
export type HfResponse = { status: number; json: unknown };

const ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";
const TIMEOUT_MS = 8000;

function parseTurnInput(body: unknown): TurnInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { goal, lastResult, fallback } = body as Record<string, unknown>;
  if (typeof goal !== "string" || typeof lastResult !== "string" || typeof fallback !== "string") return null;
  return { goal, lastResult, fallback };
}

async function errorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = parseChatCompletion(JSON.parse(text));
    if (!parsed.ok) return parsed.error;
  } catch {
    // Not JSON: fall through to the raw body.
  }
  return text.trim().slice(0, 200) || res.statusText;
}

export function createHfHandler(deps: {
  env: Record<string, string | undefined>;
  fetch: FetchLike;
  now?: () => number;
}) {
  const config = hfConfig(deps.env);
  const now = deps.now ?? (() => performance.now());

  async function turn(body: unknown): Promise<HfResponse> {
    const input = parseTurnInput(body);
    if (!input) return { status: 400, json: { ok: false, error: "Body must be { goal, lastResult, fallback } strings" } };
    if (!config.enabled) return { status: 200, json: { ok: false, error: "HF_TOKEN not set" } };

    const started = now();
    try {
      const res = await deps.fetch(ROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, max_tokens: 48, temperature: 0.3, messages: buildTurnPrompt(input) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        return { status: 200, json: { ok: false, error: `Hugging Face returned ${res.status}: ${await errorDetail(res)}` } };
      }
      const parsed = parseChatCompletion(await res.json());
      if (!parsed.ok) return { status: 200, json: { ok: false, error: parsed.error } };
      return { status: 200, json: { ok: true, text: parsed.text, ms: Math.round(now() - started) } };
    } catch (err) {
      const name = err instanceof Error || err instanceof DOMException ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        return { status: 200, json: { ok: false, error: `Hugging Face request timed out after ${TIMEOUT_MS / 1000}s` } };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { status: 200, json: { ok: false, error: `Hugging Face request failed: ${message}` } };
    }
  }

  async function handle(req: HfRequest): Promise<HfResponse | null> {
    const path = req.url.split("?")[0];
    switch (path) {
      case "/api/hf/status":
        return { status: 200, json: config.enabled ? { enabled: true, model: config.model } : { enabled: false } };
      case "/api/hf/turn":
        if (req.method !== "POST") return { status: 405, json: { ok: false, error: "Use POST for /api/hf/turn" } };
        return turn(req.body);
      default:
        return null;
    }
  }

  return { handle };
}

type Handler = ReturnType<typeof createHfHandler>;

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

export function hfMiddleware(handler: Handler) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api/hf/")) {
      next();
      return;
    }
    const method = req.method ?? "GET";
    const body = method === "POST" ? readBody(req) : Promise.resolve(undefined);
    body
      .then((parsed) => handler.handle({ method, url, body: parsed }))
      .then((out) => {
        if (!out) {
          next();
          return;
        }
        res.statusCode = out.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(out.json));
      })
      .catch(() => {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "HF middleware crashed" }));
      });
  };
}
