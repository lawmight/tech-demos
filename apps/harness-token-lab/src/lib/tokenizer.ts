import { countTokens as countCl100k } from "gpt-tokenizer/encoding/cl100k_base";
import { countTokens as countO200k } from "gpt-tokenizer/encoding/o200k_base";
import type { Encoding } from "./types";

export type Counter = (text: string) => number;

const ENCODERS: Record<Encoding, Counter> = {
  o200k_base: countO200k,
  cl100k_base: countCl100k,
};

const memo: Record<Encoding, Map<string, number>> = {
  o200k_base: new Map(),
  cl100k_base: new Map(),
};

export function count(text: string, encoding: Encoding): number {
  if (text.length === 0) return 0;
  const cache = memo[encoding];
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const n = ENCODERS[encoding](text);
  cache.set(text, n);
  return n;
}

export function counterFor(encoding: Encoding): Counter {
  return (text) => count(text, encoding);
}

export function memoSize(encoding: Encoding): number {
  return memo[encoding].size;
}
