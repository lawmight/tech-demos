import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "../src/fixtures/index";
import { parseEnvFile } from "../src/lib/dotenv";
import { providerRegistry } from "../src/lib/providers/registry";
import { GROUNDING_SCHEMA } from "../src/lib/schema";
import type { ReplayFixture } from "../src/lib/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const env = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, "utf8")) : {};

const adapter = providerRegistry.find((item) => {
  const value = env[item.envKey];
  return typeof value === "string" && value.trim() !== "";
});

if (!adapter) {
  console.error(
    "No API key in .env.local. Set AI_GATEWAY_API_KEY, MISTRAL_API_KEY, or OPENROUTER_API_KEY, then rerun. Nothing was sent.",
  );
  process.exit(1);
}

const apiKey = env[adapter.envKey]?.trim() ?? "";
const recordedAt = new Date().toISOString();

for (const fixture of fixtures) {
  const imagePath = resolve(root, "public/samples", `${fixture.imageId}.png`);
  const bytes = readFileSync(imagePath);
  const imageDataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  const built = adapter.buildRequest({
    apiKey,
    imageDataUrl,
    query: fixture.query,
    model: adapter.defaultModel,
    schema: GROUNDING_SCHEMA,
  });
  const response = await fetch(built.url, {
    method: built.method,
    headers: built.headers,
    body: JSON.stringify(built.body),
  });
  const rawResponse: unknown = await response.json();
  if (!response.ok) {
    console.error(`Provider returned ${response.status} for ${fixture.id}. Fixture left unchanged.`);
    process.exit(1);
  }
  const outcome = adapter.parseResponse(rawResponse, { width: 1000, height: 1000 });
  if (!outcome.ok) {
    console.error(`Could not parse a grounding result for ${fixture.id}. Fixture left unchanged.`);
    process.exit(1);
  }
  const next: ReplayFixture = {
    ...fixture,
    provider: adapter.id,
    model: adapter.defaultModel,
    rawResponse,
    parsed: outcome.result,
    recordedAt,
    source: "live",
  };
  writeFileSync(
    resolve(root, "src/fixtures/replay", `${fixture.id}.json`),
    `${JSON.stringify(next, null, 2)}\n`,
  );
  console.log(`recorded ${fixture.id}`);
}
