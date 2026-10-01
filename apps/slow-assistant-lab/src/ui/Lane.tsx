import { useEffect, useRef } from "react";
import { formatClock } from "../lib/metrics";
import { describeOutcome } from "../lib/outcome";
import { liveCounts } from "../lib/playback";
import type { Levers, Run, TimelineEvent } from "../lib/types";
import { LEVER_INFO } from "./harness";

export type HfTurnState =
  | { status: "pending" }
  | { status: "ok"; text: string; ms: number; model: string }
  | { status: "error"; error: string };

type Props = {
  tone: "slow" | "fast";
  title: string;
  levers: Levers;
  run: Run | null;
  progressMs: number;
  axisMs: number;
  rows: number;
  hfTurn: (stepIndex: number) => HfTurnState | undefined;
};

const TICK_STEPS_MS = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000];

function tickStep(axisMs: number): number {
  return TICK_STEPS_MS.find((step) => axisMs / step <= 6) ?? 600000;
}

function tickLabel(ms: number): string {
  if (ms < 60000) return `${ms / 1000}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function pct(ms: number, axisMs: number): string {
  return `${(ms / axisMs) * 100}%`;
}

export function Lane({ tone, title, levers, run, progressMs, axisMs, rows, hfTurn }: Props) {
  const logRef = useRef<HTMLOListElement>(null);
  const visible = run ? run.timeline.filter((event) => event.startMs < progressMs) : [];
  const counts = run ? liveCounts(run, progressMs) : { toolCalls: 0, modelTurns: 0, parallelBatches: 0 };
  const finished = run !== null && progressMs >= run.metrics.wallMs;
  const status = run === null ? "idle" : finished ? "done" : "running";

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  const step = tickStep(axisMs);
  const ticks: number[] = [];
  for (let t = 0; t <= axisMs; t += step) ticks.push(t);

  return (
    <section className={`lane lane-${tone}`} aria-label={`${title} lane`}>
      <header className="lane-head">
        <div className="lane-title">
          <h3>{title}</h3>
          <span className={`status status-${status}`}>{status}</span>
        </div>
        <div className="chips">
          {LEVER_INFO.map((lever) => (
            <span key={lever.key} className={`chip lever-chip ${levers[lever.key] ? "on" : "off"}`}>
              {levers[lever.key] ? "✓" : "✕"} {lever.label}
            </span>
          ))}
        </div>
      </header>

      <div className="lane-stats">
        <div className="clock mono" aria-label="simulated clock">
          {formatClock(progressMs)}
          <span className="clock-label">simulated</span>
        </div>
        <dl className="counters">
          <div>
            <dt>tool calls</dt>
            <dd>{counts.toolCalls}</dd>
          </div>
          <div>
            <dt>model turns</dt>
            <dd>{counts.modelTurns}</dd>
          </div>
          <div>
            <dt>parallel batches</dt>
            <dd>{counts.parallelBatches}</dd>
          </div>
        </dl>
      </div>

      <div className="gantt" style={{ ["--rows" as string]: rows }}>
        <div className="gantt-grid">
          {ticks.map((t) => (
            <span key={t} className="gantt-tick" style={{ left: pct(t, axisMs) }} />
          ))}
          {visible.map((event) => (
            <GanttBar key={event.id} event={event} progressMs={progressMs} axisMs={axisMs} />
          ))}
          {run && !finished && <span className="playhead" style={{ left: pct(progressMs, axisMs) }} />}
        </div>
        <div className="gantt-axis mono">
          {ticks.map((t) => (
            <span key={t} style={{ left: pct(t, axisMs) }}>
              {tickLabel(t)}
            </span>
          ))}
        </div>
      </div>

      {finished && run && (
        <div className={`outcome ${run.outcome.booked ? "booked" : "missed"}`} role="status">
          {describeOutcome(run.outcome, run.goal.partySize)}
        </div>
      )}

      <ol className="log" ref={logRef} aria-label={`${title} event log`}>
        {run === null && <li className="log-empty">Press Run to play this lane.</li>}
        {run &&
          visible.map((event) => {
            const active = progressMs < event.endMs;
            const step = run.steps[event.stepIndex];
            if (!step) return null;
            return (
              <li key={event.id} className={`log-row ${active ? "active" : ""} ${event.ok || active ? "" : "failed"}`}>
                <span className="log-time mono">t+{formatClock(event.startMs)}</span>
                <span className={`log-kind kind-${event.kind}`}>{event.kind === "turn" ? "turn" : event.kind}</span>
                <div className="log-body">
                  {step.kind === "turn" ? (
                    <TurnText text={step.text} hf={hfTurn(event.stepIndex)} />
                  ) : (
                    <ToolText event={event} result={step.calls[event.lane]?.result ?? ""} ended={!active} />
                  )}
                </div>
              </li>
            );
          })}
      </ol>
    </section>
  );
}

function GanttBar({ event, progressMs, axisMs }: { event: TimelineEvent; progressMs: number; axisMs: number }) {
  const end = Math.min(event.endMs, progressMs);
  const active = progressMs < event.endMs;
  return (
    <span
      className={`bar kind-${event.kind} ${event.ok || active ? "" : "failed"} ${active ? "active" : ""}`}
      style={{
        left: pct(event.startMs, axisMs),
        width: pct(end - event.startMs, axisMs),
        top: `calc(${event.lane} * var(--row-h))`,
      }}
      title={`${event.label} · ${formatClock(event.startMs)} → ${formatClock(event.endMs)}`}
    />
  );
}

function TurnText({ text, hf }: { text: string; hf: HfTurnState | undefined }) {
  if (hf === undefined) return <span className="turn-text">{text}</span>;
  switch (hf.status) {
    case "pending":
      return (
        <span className="turn-text">
          {text} <span className="hf-tag pending">HF · thinking…</span>
        </span>
      );
    case "ok":
      return (
        <span className="turn-text">
          {hf.text}{" "}
          <span className="hf-tag">
            HF · {hf.model} · {hf.ms}ms
          </span>
        </span>
      );
    case "error":
      return (
        <span className="turn-text">
          {text} <span className="hf-error">HF failed: {hf.error}</span>
        </span>
      );
    default: {
      const never: never = hf;
      return never;
    }
  }
}

function ToolText({ event, result, ended }: { event: TimelineEvent; result: string; ended: boolean }) {
  return (
    <>
      <code className="call">{event.label}</code>
      <span className={`result ${ended ? (event.ok ? "ok" : "fail") : "pending"}`}>{ended ? `→ ${result}` : "→ running…"}</span>
    </>
  );
}
