import {
  parseStatusResponse,
  parseTurnResponse,
  type HfStatus,
  type TurnInput,
  type TurnResponse,
} from "../lib/hf";

export async function fetchHfStatus(): Promise<HfStatus> {
  try {
    const res = await fetch("/api/hf/status");
    if (!res.ok) return { enabled: false };
    return parseStatusResponse(await res.json());
  } catch {
    return { enabled: false };
  }
}

export async function requestHfTurn(input: TurnInput): Promise<TurnResponse> {
  try {
    const res = await fetch("/api/hf/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseTurnResponse(await res.json());
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}
