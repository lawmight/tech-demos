import { cacheReport } from "./cache";
import { parsePrompt, parseTools } from "./parse";
import { applyFindings } from "./rewrite";
import { findAll } from "./rules";
import { counterFor } from "./tokenizer";
import type { Counts, Doc, Encoding, ParseResult, Pricing, Report } from "./types";

export const DEFAULT_PRICING: Pricing = { uncachedPerMtok: 2.5, cachedPerMtok: 1.25 };

export function analyze(
  promptText: string,
  toolsText: string,
  encoding: Encoding,
  acceptedIds: ReadonlySet<string> | null,
): ParseResult<Report> {
  const count = counterFor(encoding);
  const tools = parseTools(toolsText, count);
  if (!tools.ok) return tools;
  const doc: Doc = { sections: parsePrompt(promptText, count), tools: tools.value, encoding };
  const findings = findAll(doc, count);
  const accepted = acceptedIds === null ? findings : findings.filter((f) => acceptedIds.has(f.id));
  return {
    ok: true,
    value: {
      doc,
      findings,
      cache: cacheReport(doc, toolsText, count),
      rewrite: applyFindings(doc, accepted, count),
    },
  };
}

/** USD per request: the uncached remainder at the full rate, the cacheable prefix at the cached rate. */
export function estimateCost(counts: Counts, pricing: Pricing): number {
  const uncached = Math.max(0, counts.total - counts.prefix);
  return (uncached * pricing.uncachedPerMtok + counts.prefix * pricing.cachedPerMtok) / 1e6;
}
