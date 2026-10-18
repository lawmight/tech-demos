import type { Money } from "./types";

export function microUsd(tokens: number, multiplier: number, usdPerMillion: number): number {
  const scaledMultiplier = Math.round(multiplier * 1000);
  const cents = Math.round(usdPerMillion * 100);
  return Math.round((tokens * scaledMultiplier * cents) / 100_000);
}

export function addMoney(left: Money, right: Money): Money {
  if (left.status === "unknown") return left;
  if (right.status === "unknown") return right;
  return { status: "known", microUsd: left.microUsd + right.microUsd };
}

export function knownMoney(micro: number): Money {
  return { status: "known", microUsd: micro };
}

export function unknownMoney(reason: string): Money {
  return { status: "unknown", reason };
}

export function formatUsd(money: Money): string {
  if (money.status === "unknown") return "unknown";
  const sign = money.microUsd < 0 ? "-" : "";
  const abs = Math.abs(money.microUsd);
  const dollars = Math.floor(abs / 1_000_000);
  const fraction = String(abs % 1_000_000).padStart(6, "0");
  return `${sign}$${dollars}.${fraction}`;
}
