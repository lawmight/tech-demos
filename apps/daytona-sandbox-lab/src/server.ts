import sdkPackage from "@daytona/sdk/package.json";
import { LiveDriver } from "./drivers/live";
import { MockDriver } from "./drivers/mock";
import type { DriverContext, SandboxDriver, SandboxHandle } from "./drivers/types";
import index from "./index.html";
import { isLanguage, type LifecycleEvent, type RunRequest } from "./lifecycle";

const PORT = Number(process.env.PORT ?? 3000);
const LIVE = Boolean(process.env.DAYTONA_API_KEY);
const MAX_CODE_BYTES = 32 * 1024;

const driver: SandboxDriver = LIVE ? new LiveDriver() : new MockDriver();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

function parseRunRequest(body: unknown): RunRequest | string {
  if (typeof body !== "object" || body === null) return "Body must be a JSON object";
  const { language, code, presetId } = body as Record<string, unknown>;
  if (!isLanguage(language)) return "Unknown language";
  if (typeof code !== "string" || code.trim().length === 0) return "Snippet is empty";
  if (code.length > MAX_CODE_BYTES) return "Snippet is over 32 KB";
  if (presetId !== undefined && typeof presetId !== "string") return "presetId must be a string";
  return { language, code, presetId };
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Runs create → exec → destroy, narrating every step. Destroy always runs once create succeeded. */
async function runLifecycle(req: RunRequest, send: (event: LifecycleEvent) => void): Promise<void> {
  const t0 = Date.now();
  const ctx: DriverContext = {
    log: (message) => send({ type: "log", at: Date.now() - t0, message }),
    sandbox: (sandbox) => send({ type: "sandbox", sandbox }),
  };

  let handle: SandboxHandle;
  const createStarted = Date.now();
  send({ type: "phase", phase: "create", status: "running" });
  try {
    handle = await driver.create(req, ctx);
    send({ type: "phase", phase: "create", status: "done", ms: Date.now() - createStarted });
  } catch (err) {
    send({ type: "phase", phase: "create", status: "error", ms: Date.now() - createStarted });
    send({ type: "phase", phase: "exec", status: "skipped" });
    send({ type: "phase", phase: "destroy", status: "skipped" });
    send({ type: "error", phase: "create", message: errorMessage(err) });
    return;
  }

  let failed = false;
  const execStarted = Date.now();
  send({ type: "phase", phase: "exec", status: "running" });
  try {
    const result = await handle.exec(req, ctx);
    send({ type: "exec", result });
    send({ type: "phase", phase: "exec", status: "done", ms: Date.now() - execStarted });
  } catch (err) {
    failed = true;
    send({ type: "phase", phase: "exec", status: "error", ms: Date.now() - execStarted });
    send({ type: "error", phase: "exec", message: errorMessage(err) });
  }

  const destroyStarted = Date.now();
  send({ type: "phase", phase: "destroy", status: "running" });
  try {
    await handle.destroy(ctx);
    send({ type: "phase", phase: "destroy", status: "done", ms: Date.now() - destroyStarted });
  } catch (err) {
    failed = true;
    send({ type: "phase", phase: "destroy", status: "error", ms: Date.now() - destroyStarted });
    send({ type: "error", phase: "destroy", message: errorMessage(err) });
  }

  if (!failed) send({ type: "done", totalMs: Date.now() - t0 });
}

async function run(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }
  const parsed = parseRunRequest(body);
  if (typeof parsed === "string") return json({ error: parsed }, 400);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: LifecycleEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await runLifecycle(parsed, send);
      } catch (err) {
        send({ type: "error", phase: null, message: errorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
  routes: {
    "/": index,
    "/api/status": () =>
      json({
        mode: driver.mode,
        sdkVersion: sdkPackage.version,
        target: LIVE ? (process.env.DAYTONA_TARGET ?? "default") : "mock-us",
      }),
    "/api/run": { POST: run },
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(
  `daytona-sandbox-lab → http://localhost:${server.port}  (mode: ${driver.mode}${LIVE ? "" : " — set DAYTONA_API_KEY for live sandboxes"})`,
);
