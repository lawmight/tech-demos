import { activeTtlSeconds, activeWriteMultiplier, knownValue } from "./fields";
import { addMoney, knownMoney, microUsd, unknownMoney } from "./money";
import type {
  GapWhatIf,
  Money,
  ProviderProfile,
  Replay,
  Session,
  SessionTurn,
  TokenAccount,
  TtlChoice,
  TurnOutcome,
  Warmth,
} from "./types";

type CacheHold = {
  expiryMs: number;
  cachedTokens: number;
};

function inputCost(
  tokens: number,
  multiplier: number | null,
  usdPerMillion: number | null,
  reason: string,
): Money {
  if (tokens === 0) return knownMoney(0);
  if (multiplier === null || usdPerMillion === null) return unknownMoney(reason);
  return knownMoney(microUsd(tokens, multiplier, usdPerMillion));
}

function outputCost(tokens: number, usdPerMillion: number | null): Money {
  if (usdPerMillion === null) return unknownMoney("output price is unknown");
  return knownMoney(microUsd(tokens, 1, usdPerMillion));
}

function pingsToStayWarm(gapMs: number, ttlMs: number): number {
  if (gapMs < ttlMs) return 0;
  let expiry = ttlMs;
  let pings = 0;
  while (expiry <= gapMs && pings < 10_000) {
    pings += 1;
    expiry += ttlMs;
  }
  return pings;
}

function longestGap(turns: SessionTurn[]): { gapMs: number; before: SessionTurn; after: SessionTurn } | null {
  let best: { gapMs: number; before: SessionTurn; after: SessionTurn } | null = null;
  for (let index = 1; index < turns.length; index += 1) {
    const before = turns[index - 1];
    const after = turns[index];
    if (!before || !after) continue;
    const gapMs = after.atMs - before.atMs;
    if (!best || gapMs > best.gapMs) best = { gapMs, before, after };
  }
  return best;
}

function simulateTurns(
  turns: SessionTurn[],
  ttlMs: number,
  minTokens: number,
): { outcomes: TurnOutcome[]; hold: CacheHold | null } {
  let hold: CacheHold | null = null;
  const outcomes: TurnOutcome[] = [];
  for (const turn of turns) {
    const warm = hold !== null && turn.atMs < hold.expiryMs;
    if (turn.promptTokens < minTokens) {
      outcomes.push({
        id: turn.id,
        atMs: turn.atMs,
        label: turn.label,
        marker: "miss",
        promptTokens: turn.promptTokens,
        readTokens: 0,
        writeTokens: 0,
        uncachedTokens: turn.promptTokens,
        outputTokens: turn.outputTokens,
      });
      hold = null;
      continue;
    }
    if (!warm || hold === null) {
      outcomes.push({
        id: turn.id,
        atMs: turn.atMs,
        label: turn.label,
        marker: "write",
        promptTokens: turn.promptTokens,
        readTokens: 0,
        writeTokens: turn.promptTokens,
        uncachedTokens: 0,
        outputTokens: turn.outputTokens,
      });
      hold = { expiryMs: turn.atMs + ttlMs, cachedTokens: turn.promptTokens };
      continue;
    }
    const cached = Math.min(hold.cachedTokens, turn.promptTokens);
    const delta = turn.promptTokens - cached;
    outcomes.push({
      id: turn.id,
      atMs: turn.atMs,
      label: turn.label,
      marker: "hit",
      promptTokens: turn.promptTokens,
      readTokens: cached,
      writeTokens: delta,
      uncachedTokens: 0,
      outputTokens: turn.outputTokens,
    });
    hold = { expiryMs: turn.atMs + ttlMs, cachedTokens: turn.promptTokens };
  }
  return { outcomes, hold };
}

function priceOutcome(
  outcome: TurnOutcome,
  writeMultiplier: number | null,
  readMultiplier: number | null,
  inputUsd: number | null,
  outputUsd: number | null,
): Money {
  const read = inputCost(outcome.readTokens, readMultiplier, inputUsd, "cache read multiplier or input price is unknown");
  const write = inputCost(outcome.writeTokens, writeMultiplier, inputUsd, "cache write multiplier or input price is unknown");
  const fresh = inputCost(outcome.uncachedTokens, 1, inputUsd, "input price is unknown");
  const output = outputCost(outcome.outputTokens, outputUsd);
  return addMoney(addMoney(addMoney(read, write), fresh), output);
}

function coldOutcome(outcome: TurnOutcome, inputUsd: number | null, outputUsd: number | null): Money {
  const input = inputCost(outcome.promptTokens, 1, inputUsd, "input price is unknown");
  return addMoney(input, outputCost(outcome.outputTokens, outputUsd));
}

function sumMoney(parts: Money[]): Money {
  return parts.reduce<Money>((total, part) => addMoney(total, part), knownMoney(0));
}

function gapWhatIf(
  session: Session,
  ttlMs: number | null,
  minTokens: number | null,
  writeMultiplier: number | null,
  readMultiplier: number | null,
  inputUsd: number | null,
): GapWhatIf | null {
  const gap = longestGap(session.turns);
  if (!gap) return null;
  if (ttlMs === null || minTokens === null) {
    return {
      gapMs: gap.gapMs,
      fromLabel: gap.before.label,
      toLabel: gap.after.label,
      pingsNeeded: 0,
      pingPath: unknownMoney("TTL or minimum cacheable prefix is unknown"),
      rewritePath: unknownMoney("TTL or minimum cacheable prefix is unknown"),
      breakEvenPings: null,
      insideTtl: false,
    };
  }
  const prefix = gap.before.promptTokens;
  const next = gap.after.promptTokens;
  if (prefix < minTokens || next < minTokens) {
    return {
      gapMs: gap.gapMs,
      fromLabel: gap.before.label,
      toLabel: gap.after.label,
      pingsNeeded: 0,
      pingPath: unknownMoney("a turn in the gap is below the minimum cacheable prefix"),
      rewritePath: unknownMoney("a turn in the gap is below the minimum cacheable prefix"),
      breakEvenPings: null,
      insideTtl: gap.gapMs < ttlMs,
    };
  }
  const pingsNeeded = pingsToStayWarm(gap.gapMs, ttlMs);
  const insideTtl = pingsNeeded === 0;
  const readPrefix = inputCost(prefix, readMultiplier, inputUsd, "cache read multiplier or input price is unknown");
  const writeNext = inputCost(next, writeMultiplier, inputUsd, "cache write multiplier or input price is unknown");
  const delta = Math.max(0, next - prefix);
  const warmReturn = addMoney(
    inputCost(prefix, readMultiplier, inputUsd, "cache read multiplier or input price is unknown"),
    inputCost(delta, writeMultiplier, inputUsd, "cache write multiplier or input price is unknown"),
  );
  let pingPath = warmReturn;
  for (let ping = 0; ping < pingsNeeded; ping += 1) pingPath = addMoney(pingPath, readPrefix);
  const rewritePath = writeNext;
  let breakEvenPings: number | null = null;
  if (readPrefix.status === "known" && writeNext.status === "known" && warmReturn.status === "known" && readPrefix.microUsd > 0) {
    breakEvenPings = (writeNext.microUsd - warmReturn.microUsd) / readPrefix.microUsd;
  }
  return {
    gapMs: gap.gapMs,
    fromLabel: gap.before.label,
    toLabel: gap.after.label,
    pingsNeeded,
    pingPath: insideTtl ? warmReturn : pingPath,
    rewritePath: insideTtl ? warmReturn : rewritePath,
    breakEvenPings,
    insideTtl,
  };
}

function tokensAgainstLimit(profile: ProviderProfile, outcomes: TurnOutcome[], rulesKnown: boolean): TokenAccount {
  if (!rulesKnown) return { status: "unknown", reason: "cache hit or miss is unknown, so the token total is unknown" };
  const answer = profile.readsCountTowardRateLimit.value;
  if (answer === "unknown" || answer === "partial") {
    return {
      status: "unknown",
      reason:
        answer === "partial"
          ? "partial rate-limit treatment has no published fraction to apply"
          : "whether cache reads count is unknown",
    };
  }
  let tokens = 0;
  for (const outcome of outcomes) {
    tokens += outcome.writeTokens + outcome.uncachedTokens;
    if (answer === "yes") tokens += outcome.readTokens;
  }
  return { status: "known", tokens };
}

export function replay(session: Session, profile: ProviderProfile, nowMs: number, choice: TtlChoice): Replay {
  const ttlSeconds = activeTtlSeconds(profile, choice);
  const minTokens = knownValue(profile.minCacheablePrefixTokens);
  const writeMultiplier = activeWriteMultiplier(profile, choice);
  const readMultiplier = knownValue(profile.cacheReadMultiplier);
  const inputUsd = knownValue(profile.inputUsdPerMillion);
  const outputUsd = knownValue(profile.outputUsdPerMillion);
  const elapsed = session.turns.filter((turn) => turn.atMs <= nowMs);
  const rulesKnown = ttlSeconds !== null && minTokens !== null;

  let turns: TurnOutcome[];
  let warmth: Warmth;
  if (!rulesKnown || ttlSeconds === null || minTokens === null) {
    turns = elapsed.map((turn) => ({
      id: turn.id,
      atMs: turn.atMs,
      label: turn.label,
      marker: "unknown",
      promptTokens: turn.promptTokens,
      readTokens: 0,
      writeTokens: 0,
      uncachedTokens: 0,
      outputTokens: turn.outputTokens,
    }));
    warmth = { status: "unknown" };
  } else {
    const ttlMs = ttlSeconds * 1000;
    const simulated = simulateTurns(elapsed, ttlMs, minTokens);
    turns = simulated.outcomes;
    if (simulated.hold !== null && nowMs < simulated.hold.expiryMs) {
      warmth = { status: "warm", remainingMs: simulated.hold.expiryMs - nowMs, ttlMs };
    } else {
      warmth = { status: "cold", remainingMs: 0, ttlMs };
    }
  }

  const warm = rulesKnown
    ? sumMoney(turns.map((turn) => priceOutcome(turn, writeMultiplier, readMultiplier, inputUsd, outputUsd)))
    : unknownMoney("TTL or minimum cacheable prefix is unknown");
  const cold = sumMoney(elapsed.map((turn) => coldOutcome(
    {
      id: turn.id,
      atMs: turn.atMs,
      label: turn.label,
      marker: "miss",
      promptTokens: turn.promptTokens,
      readTokens: 0,
      writeTokens: 0,
      uncachedTokens: turn.promptTokens,
      outputTokens: turn.outputTokens,
    },
    inputUsd,
    outputUsd,
  )));

  return {
    warmth,
    turns,
    warm,
    cold,
    gap: gapWhatIf(session, ttlSeconds === null ? null : ttlSeconds * 1000, minTokens, writeMultiplier, readMultiplier, inputUsd),
    tokensAgainstLimit: tokensAgainstLimit(profile, turns, rulesKnown),
  };
}

export function sessionEndMs(session: Session, profiles: ProviderProfile[], choice: TtlChoice): number {
  const last = session.turns.at(-1)?.atMs ?? 0;
  let tail = 30_000;
  for (const profile of profiles) {
    const ttl = activeTtlSeconds(profile, choice);
    if (ttl !== null) tail = Math.max(tail, ttl * 1000);
  }
  return last + tail;
}

export function shouldNudge(warmth: Warmth, leadMs: number): boolean {
  return warmth.status === "warm" && warmth.remainingMs > 0 && warmth.remainingMs <= leadMs;
}
