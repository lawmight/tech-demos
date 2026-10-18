import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { parseEnvFile } from "./src/lib/dotenv";
import { handleGroundRequest, keyStatus } from "./src/lib/proxy";

function readLocalEnv(): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = { ...process.env };
  const file = resolve(dirname(fileURLToPath(import.meta.url)), ".env.local");
  if (!existsSync(file)) return merged;
  const parsed = parseEnvFile(readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!merged[key]) merged[key] = value;
  }
  return merged;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return {};
  return JSON.parse(text) as unknown;
}

function send(res: ServerResponse, status: number, json: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(json));
}

function groundProxy(): Plugin {
  return {
    name: "le-chonk-ground-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/ground" && url !== "/api/key-status") {
          next();
          return;
        }
        try {
          const env = readLocalEnv();
          if (url === "/api/key-status") {
            send(res, 200, keyStatus(env));
            return;
          }
          if (req.method !== "POST") {
            send(res, 405, { ok: false, error: "Use POST." });
            return;
          }
          const body = await readJson(req);
          const result = await handleGroundRequest(body, { env, fetchImpl: fetch });
          send(res, result.status, result.json);
        } catch {
          send(res, 400, { ok: false, error: "Could not read the request." });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [groundProxy()],
  server: { host: "0.0.0.0", port: 5173 },
});
