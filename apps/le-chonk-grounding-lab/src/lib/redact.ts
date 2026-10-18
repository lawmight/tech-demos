export function redactSecret(value: unknown, secret: string): unknown {
  if (secret === "") return value;
  if (typeof value === "string") return value.split(secret).join("[redacted]");
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => redactSecret(item, secret));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = redactSecret(item, secret);
    }
    return out;
  }
  return value;
}

export function containsSecret(value: unknown, secret: string): boolean {
  if (secret === "") return false;
  return JSON.stringify(value).includes(secret);
}
