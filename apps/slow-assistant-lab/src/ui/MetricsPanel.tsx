import { formatClock, speedup } from "../lib/metrics";
import type { Metrics } from "../lib/types";

export type LaneMetrics =
  | { kind: "none" }
  | { kind: "running" }
  | { kind: "run"; metrics: Metrics }
  | { kind: "last"; metrics: Metrics };

const ROWS: ReadonlyArray<{ label: string; value: (m: Metrics) => string }> = [
  { label: "Tool calls", value: (m) => String(m.toolCalls) },
  { label: "Model turns", value: (m) => String(m.modelTurns) },
  { label: "Parallel batches", value: (m) => String(m.parallelBatches) },
  { label: "Failed calls", value: (m) => String(m.failedCalls) },
  { label: "Wall clock", value: (m) => formatClock(m.wallMs) },
];

function metricsOf(lane: LaneMetrics): Metrics | null {
  switch (lane.kind) {
    case "run":
    case "last":
      return lane.metrics;
    case "none":
    case "running":
      return null;
    default: {
      const never: never = lane;
      return never;
    }
  }
}

function cell(lane: LaneMetrics, value: (m: Metrics) => string): string {
  const m = metricsOf(lane);
  if (m) return value(m);
  return lane.kind === "running" ? "…" : "–";
}

export function MetricsPanel({ slow, fast }: { slow: LaneMetrics; fast: LaneMetrics }) {
  const slowM = metricsOf(slow);
  const fastM = metricsOf(fast);
  const factor = slowM && fastM ? speedup(slowM, fastM) : null;
  const fromLastSession = slow.kind === "last" || fast.kind === "last";

  return (
    <section className="panel metrics" aria-label="Metrics">
      <div className="panel-head">
        <h2>Metrics</h2>
        {fromLastSession && <span className="muted">restored from your last session</span>}
      </div>
      <div className="metrics-body">
        <table className="metrics-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">
                Slow <span className="muted">simulated</span>
              </th>
              <th scope="col">
                Fast <span className="muted">simulated</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td className="mono">{cell(slow, row.value)}</td>
                <td className="mono">{cell(fast, row.value)}</td>
              </tr>
            ))}
            <tr className="blog-row">
              <th scope="row">
                Blog reference <span className="muted">(not simulated)</span>
              </th>
              <td>Grok Bot ~7m40s</td>
              <td>Pi + Qwen on Cerebras + skill ~22s median</td>
            </tr>
          </tbody>
        </table>
        <div className="speedup">
          {factor !== null ? (
            <>
              <span className="speedup-label">Fast is</span>
              <span className="speedup-value">{factor.toFixed(1)}x</span>
              <span className="speedup-label">faster (simulated)</span>
            </>
          ) : (
            <span className="muted">Run both lanes to compare.</span>
          )}
        </div>
      </div>
    </section>
  );
}
