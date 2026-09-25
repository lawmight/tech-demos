import type { Block, LayoutRow, Report } from "../lib/types";
import { Stat, fmt, pct } from "./shared";

function blockLabel(block: Block): string {
  switch (block.kind) {
    case "section":
      return block.heading ?? "(opening block)";
    case "tool":
      return block.name;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function Row({ row, blocks }: { row: LayoutRow; blocks: Map<string, Block> }) {
  if (row.slot === "breakpoint") {
    return <div className="layout-row breakpoint">{row.label}</div>;
  }
  const names = row.blockIds.map((id) => blocks.get(id)).filter((b): b is Block => b !== undefined);
  return (
    <div className={`layout-row${names.length === 0 ? " empty" : ""}`}>
      <div className="head">
        <span className={`chip ${row.slot === "setup" ? "cache" : row.slot === "conversation" ? "muted" : ""}`}>
          {row.slot}
        </span>
        <span>{row.label}</span>
        <span className="tokens">{fmt(row.tokens)} tokens</span>
      </div>
      {names.length > 0 ? (
        <div className="blocks">{names.map(blockLabel).join(" / ")}</div>
      ) : row.slot === "conversation" ? (
        <div className="blocks">Turns go here. Nothing above this line should change between them.</div>
      ) : (
        <div className="blocks">(nothing in this slot)</div>
      )}
    </div>
  );
}

export function CacheLayout({ report }: { report: Report }) {
  const { cache, doc, rewrite } = report;
  const blocks = new Map<string, Block>();
  for (const s of doc.sections) blocks.set(s.id, s);
  for (const t of doc.tools) blocks.set(t.id, t);
  const passed = cache.checklist.filter((c) => c.pass).length;

  return (
    <div data-testid="panel-cache">
      <div className="stats">
        <Stat label="Checklist" value={`${passed} / ${cache.checklist.length}`} sub="checks passing" good={passed === cache.checklist.length} />
        <Stat
          label="Stable prefix, current order"
          value={fmt(cache.stablePrefixTokens)}
          sub={`${pct(cache.stablePrefixTokens, rewrite.before.total)} of static`}
        />
        <Stat
          label="Stable prefix, recommended order"
          value={fmt(cache.recommendedPrefixTokens)}
          sub={`${pct(cache.recommendedPrefixTokens, rewrite.before.total)} of static`}
          good={cache.recommendedPrefixTokens > cache.stablePrefixTokens}
        />
      </div>

      <ul className="checklist" data-testid="checklist">
        {cache.checklist.map((item) => (
          <li key={item.id} className={item.pass ? "pass" : "fail"} data-testid={`check-${item.id}`}>
            <span className="mark" aria-label={item.pass ? "pass" : "fail"}>
              {item.pass ? "\u2713" : "\u2717"}
            </span>
            <span className="label">{item.label}</span>
            <span className="detail">{item.detail}</span>
          </li>
        ))}
      </ul>

      <div className="columns">
        <div>
          <h2 className="section-title">Current order</h2>
          <div className="layout-rows">
            {cache.current.map((row, i) => (
              <Row key={`${row.slot}-${i}`} row={row} blocks={blocks} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title">Recommended order</h2>
          <div className="layout-rows">
            {cache.recommended.map((row, i) => (
              <Row key={`${row.slot}-${i}`} row={row} blocks={blocks} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
