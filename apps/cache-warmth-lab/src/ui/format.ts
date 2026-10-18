import type { Field, Money, TokenAccount } from "../lib/types";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatUsd(money: Money): string {
  if (money.status === "unknown") return "unknown";
  const sign = money.microUsd < 0 ? "-" : "";
  const abs = Math.abs(money.microUsd);
  const dollars = Math.floor(abs / 1_000_000);
  const fraction = String(abs % 1_000_000).padStart(6, "0");
  return `${sign}$${dollars}.${fraction}`;
}

export function formatTokens(account: TokenAccount): string {
  if (account.status === "unknown") return "unknown";
  return account.tokens.toLocaleString("en-US");
}

export function formatField(field: Field<number>, digits = 2): string {
  if (field.kind === "unknown") return "unknown";
  return Number.isInteger(field.value) ? String(field.value) : field.value.toFixed(digits);
}

export function formatMode(field: Field<string>): string {
  return field.kind === "unknown" ? "unknown" : field.value;
}
