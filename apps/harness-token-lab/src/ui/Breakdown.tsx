import { estimateCost } from "../lib/analyze";
import type { Pricing, Report } from "../lib/types";
import { Chip, ShareBar, Stat, fmt, pct } from "./shared";

export function Breakdown({
  report,
  pricing,
  onPricing,
}: {
  report: Report;
  pricing: Pricing;
  onPricing: (p: Pricing) => void;
}) {
  const { doc, cache, rewrite } = report;
  const { before } = rewrite;
  const cost = estimateCost(before, pricing);

  return (
    <div data-testid="panel-breakdown">
      <div className="stats">
        <Stat label="Prompt tokens" value={fmt(before.prompt)} sub={`${doc.sections.length} sections`} />
        <Stat label="Tool tokens" value={fmt(before.tools)} sub={`${doc.tools.length} tools`} />
        <Stat label="Static total per request" value={fmt(before.total)} sub={doc.encoding} />
        <Stat
          label="Cached prefix (current order)"
          value={fmt(cache.stablePrefixTokens)}
          sub={`${pct(cache.stablePrefixTokens, before.total)} of static`}
        />
      </div>

      <h2 className="section-title">Sections</h2>
      {doc.sections.length === 0 ? (
        <div className="empty">Paste a system prompt to see per-section counts.</div>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Heading</th>
              <th className="num">Tokens</th>
              <th className="bar">Share of static</th>
              <th>Volatile</th>
            </tr>
          </thead>
          <tbody>
            {doc.sections.map((s) => (
              <tr key={s.id}>
                <td>{s.heading ?? <span className="hint">(opening block)</span>}</td>
                <td className="num">{fmt(s.tokens)}</td>
                <td className="bar">
                  <ShareBar part={s.tokens} whole={before.total} volatile={s.volatile.length > 0} />
                </td>
                <td>
                  <div className="chips">
                    {[...new Set(s.volatile.map((v) => v.kind))].map((kind) => (
                      <Chip key={kind} kind="volatile">
                        {kind}
                      </Chip>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="section-title">Tools</h2>
      {doc.tools.length === 0 ? (
        <div className="empty">Paste tool definitions to see per-tool counts.</div>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Name</th>
              <th>Set</th>
              <th className="num">Tokens</th>
              <th className="bar">Share of static</th>
            </tr>
          </thead>
          <tbody>
            {doc.tools.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.name}</code>
                </td>
                <td>
                  <div className="chips">
                    {t.core ? <Chip kind="core">core</Chip> : <Chip kind="muted">integration</Chip>}
                    <Chip kind="muted">{t.usagePct === null ? "usage n/a" : `used ${t.usagePct}%`}</Chip>
                  </div>
                </td>
                <td className="num">{fmt(t.tokens)}</td>
                <td className="bar">
                  <ShareBar part={t.tokens} whole={before.total} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="cost">
        <div className="field">
          <label htmlFor="price-uncached">$ per Mtok, uncached</label>
          <input
            id="price-uncached"
            type="number"
            min={0}
            step={0.05}
            value={pricing.uncachedPerMtok}
            onChange={(e) => onPricing({ ...pricing, uncachedPerMtok: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label htmlFor="price-cached">$ per Mtok, cached</label>
          <input
            id="price-cached"
            type="number"
            min={0}
            step={0.05}
            value={pricing.cachedPerMtok}
            onChange={(e) => onPricing({ ...pricing, cachedPerMtok: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="result">
          <div className="stat-label">Static input cost per request (estimate)</div>
          <div className="stat-value mono">${cost.toFixed(5)}</div>
          <div className="stat-sub">
            {fmt(before.total - before.prefix)} uncached + {fmt(before.prefix)} cached tokens
          </div>
        </div>
      </div>
    </div>
  );
}
