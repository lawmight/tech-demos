import type { Counts, Report } from "../lib/types";
import { CopyButton, fmt, pct } from "./shared";

const COUNT_ROWS: ReadonlyArray<{ key: keyof Counts; label: string }> = [
  { key: "prompt", label: "Prompt" },
  { key: "tools", label: "Tools" },
  { key: "setup", label: "Setup message" },
  { key: "total", label: "Total per request" },
  { key: "prefix", label: "Cached prefix" },
];

function originalPrompt(report: Report): string {
  return report.doc.sections.map((s) => s.text).join("\n\n");
}

function Pane({ title, text, tokens }: { title: string; text: string; tokens: number }) {
  return (
    <div className="pane">
      <div className="pane-head">
        <h3>{title}</h3>
        <span className="tokens">{fmt(tokens)} tokens</span>
        <CopyButton text={text} />
      </div>
      <pre className="code">{text === "" ? "(nothing moved after the boundary)" : text}</pre>
    </div>
  );
}

export function RewritePanel({ report }: { report: Report }) {
  const { rewrite } = report;
  const { before, after } = rewrite;
  const savingsPct = Math.round(rewrite.savings * 100);
  const uncachedPct = Math.round(rewrite.uncachedSavings * 100);

  return (
    <div data-testid="panel-rewrite">
      <div className="stats">
        <div className="stat good">
          <div className="stat-label">Savings</div>
          <div className="stat-value">{savingsPct}%</div>
          <div className="stat-sub">
            {fmt(before.total)} to {fmt(after.total)} static tokens
          </div>
        </div>
        <div className="stat good">
          <div className="stat-label">Uncached savings</div>
          <div className="stat-value">{uncachedPct}%</div>
          <div className="stat-sub">
            {fmt(before.total - before.prefix)} to {fmt(after.total - after.prefix)} static tokens re-read every
            turn
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Cached share</div>
          <div className="stat-value">
            {pct(before.prefix, before.total)} to {pct(after.prefix, after.total)}
          </div>
          <div className="stat-sub">prefix as a share of each request</div>
        </div>
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th>Tokens</th>
            <th className="num">Before</th>
            <th className="num">After</th>
            <th className="num">Delta</th>
          </tr>
        </thead>
        <tbody>
          {COUNT_ROWS.map(({ key, label }) => {
            const delta = after[key] - before[key];
            return (
              <tr key={key}>
                <td>{label}</td>
                <td className="num">{fmt(before[key])}</td>
                <td className="num">{fmt(after[key])}</td>
                <td className="num" style={{ color: delta < 0 ? "var(--save)" : delta > 0 ? "var(--trap)" : undefined }}>
                  {delta > 0 ? "+" : ""}
                  {fmt(delta)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="section-title">Before / after prompt</h2>
      <div className="columns">
        <Pane title="Before" text={originalPrompt(report)} tokens={before.prompt} />
        <Pane title="After" text={rewrite.prompt} tokens={after.prompt} />
      </div>

      <h2 className="section-title">Outputs</h2>
      <div className="panes">
        <Pane title="Rewritten system prompt" text={rewrite.prompt} tokens={after.prompt} />
        <Pane title="Setup message (user role, after the cache boundary)" text={rewrite.setupMessage} tokens={after.setup} />
        <Pane title="Tools JSON (sorted, canonical keys)" text={rewrite.toolsJson} tokens={after.tools} />
      </div>
    </div>
  );
}
