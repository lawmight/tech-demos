export type CacheMode = "automatic" | "explicit";

export type RateAnswer = "yes" | "no" | "partial" | "unknown";

export type Known<T> = {
  kind: "known";
  value: T;
  source: string;
};

export type UnknownField = {
  kind: "unknown";
  source: string | null;
};

export type Field<T> = Known<T> | UnknownField;

export type RateRule = {
  value: RateAnswer;
  source: string | null;
  note: string;
};

export type ProviderProfile = {
  id: string;
  label: string;
  model: string;
  asOf: string;
  ttlSeconds: Field<number>;
  extendedTtlSeconds: Field<number>;
  minCacheablePrefixTokens: Field<number>;
  cacheMode: Field<CacheMode>;
  inputUsdPerMillion: Field<number>;
  outputUsdPerMillion: Field<number>;
  cacheWriteMultiplier: Field<number>;
  extendedCacheWriteMultiplier: Field<number>;
  cacheReadMultiplier: Field<number>;
  readsCountTowardRateLimit: RateRule;
  notes: string;
};

export type SessionTurn = {
  id: string;
  atMs: number;
  label: string;
  promptTokens: number;
  outputTokens: number;
};

export type SessionSource = "sample" | "claude-code" | "codex" | "generic";

export type Session = {
  id: string;
  title: string;
  source: SessionSource;
  turns: SessionTurn[];
};

export type ImportResult = {
  session: Session | null;
  warnings: string[];
};

export type TtlChoice = "default" | "extended";

export type TurnMarker = "hit" | "write" | "miss" | "unknown";

export type TurnOutcome = {
  id: string;
  atMs: number;
  label: string;
  marker: TurnMarker;
  promptTokens: number;
  readTokens: number;
  writeTokens: number;
  uncachedTokens: number;
  outputTokens: number;
};

export type Warmth =
  | { status: "unknown" }
  | { status: "cold"; remainingMs: 0; ttlMs: number }
  | { status: "warm"; remainingMs: number; ttlMs: number };

export type Money =
  | { status: "unknown"; reason: string }
  | { status: "known"; microUsd: number };

export type TokenAccount =
  | { status: "unknown"; reason: string }
  | { status: "known"; tokens: number };

export type GapWhatIf = {
  gapMs: number;
  fromLabel: string;
  toLabel: string;
  pingsNeeded: number;
  pingPath: Money;
  rewritePath: Money;
  breakEvenPings: number | null;
  insideTtl: boolean;
};

export type Replay = {
  warmth: Warmth;
  turns: TurnOutcome[];
  warm: Money;
  cold: Money;
  gap: GapWhatIf | null;
  tokensAgainstLimit: TokenAccount;
};
