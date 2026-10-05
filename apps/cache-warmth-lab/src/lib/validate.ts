import type { Field, ProviderProfile } from "./types";

const HTTPS = /^https:\/\/\S+$/;

function checkField(id: string, name: string, field: Field<unknown>, errors: string[]): void {
  if (field.kind === "known" && !HTTPS.test(field.source)) {
    errors.push(`${id}.${name} is set without an https source`);
  }
}

export function validateProfiles(profiles: ProviderProfile[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const profile of profiles) {
    if (seen.has(profile.id)) errors.push(`duplicate id ${profile.id}`);
    seen.add(profile.id);
    checkField(profile.id, "ttlSeconds", profile.ttlSeconds, errors);
    checkField(profile.id, "extendedTtlSeconds", profile.extendedTtlSeconds, errors);
    checkField(profile.id, "minCacheablePrefixTokens", profile.minCacheablePrefixTokens, errors);
    checkField(profile.id, "cacheMode", profile.cacheMode, errors);
    checkField(profile.id, "inputUsdPerMillion", profile.inputUsdPerMillion, errors);
    checkField(profile.id, "outputUsdPerMillion", profile.outputUsdPerMillion, errors);
    checkField(profile.id, "cacheWriteMultiplier", profile.cacheWriteMultiplier, errors);
    checkField(profile.id, "extendedCacheWriteMultiplier", profile.extendedCacheWriteMultiplier, errors);
    checkField(profile.id, "cacheReadMultiplier", profile.cacheReadMultiplier, errors);
    const rule = profile.readsCountTowardRateLimit;
    if (rule.value !== "unknown" && (rule.source === null || !HTTPS.test(rule.source))) {
      errors.push(`${profile.id}.readsCountTowardRateLimit is set without an https source`);
    }
  }
  return errors;
}
