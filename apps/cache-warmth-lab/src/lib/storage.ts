import type { ProviderProfile } from "./types";

function isField(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === "known" || kind === "unknown";
}

function isProfile(value: unknown): value is ProviderProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ProviderProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.label === "string" &&
    typeof profile.model === "string" &&
    isField(profile.ttlSeconds) &&
    isField(profile.inputUsdPerMillion) &&
    isField(profile.cacheReadMultiplier) &&
    !!profile.readsCountTowardRateLimit &&
    typeof profile.readsCountTowardRateLimit === "object"
  );
}

export const STORAGE_KEY = "cache-warmth-lab:profiles:v1";

type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function loadProfiles(store: Store, shipped: ProviderProfile[]): ProviderProfile[] {
  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return shipped;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isProfile)) return shipped;
    return parsed;
  } catch {
    return shipped;
  }
}

export function saveProfiles(store: Store, profiles: ProviderProfile[]): void {
  store.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function resetProfiles(store: Store): void {
  store.removeItem(STORAGE_KEY);
}
