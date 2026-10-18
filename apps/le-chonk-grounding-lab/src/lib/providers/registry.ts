import type { ProviderId } from "../types";
import { mistralAdapter } from "./mistral";
import { openRouterAdapter } from "./openrouter";
import type { ProviderAdapter } from "./types";
import { vercelAdapter } from "./vercel";

export const DEFAULT_PROVIDER_ID: ProviderId = "vercel";

export const providerRegistry: readonly ProviderAdapter[] = [
  vercelAdapter,
  mistralAdapter,
  openRouterAdapter,
];

export function getProvider(id: string): ProviderAdapter | undefined {
  return providerRegistry.find((adapter) => adapter.id === id);
}

export function selectRunMode(input: {
  requested: "replay" | "live";
  hasKey: boolean;
}): "replay" | "live" {
  if (!input.hasKey) return "replay";
  return input.requested;
}
