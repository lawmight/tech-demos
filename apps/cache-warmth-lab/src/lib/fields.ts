import type { Field, ProviderProfile, TtlChoice } from "./types";

export function knownValue<T>(field: Field<T>): T | null {
  return field.kind === "known" ? field.value : null;
}

export function activeTtlSeconds(profile: ProviderProfile, choice: TtlChoice): number | null {
  return knownValue(choice === "extended" ? profile.extendedTtlSeconds : profile.ttlSeconds);
}

export function activeWriteMultiplier(profile: ProviderProfile, choice: TtlChoice): number | null {
  return knownValue(
    choice === "extended" ? profile.extendedCacheWriteMultiplier : profile.cacheWriteMultiplier,
  );
}
