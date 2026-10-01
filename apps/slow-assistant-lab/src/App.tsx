import { useEffect, useMemo, useRef, useState } from "react";
import type { HfStatus } from "./lib/hf";
import { lastToolResult } from "./lib/playback";
import { SLOW_LEVERS } from "./lib/planner";
import { simulate } from "./lib/simulate";
import { SAMPLE_SKILL } from "./lib/skill";
import { DEFAULT_SAVED, SPEEDS, STORAGE_KEY, parseSaved, type ModelMode, type Saved, type Speed } from "./lib/storage";
import type { Levers, Metrics, Run } from "./lib/types";
import { DEFAULT_WORLD } from "./lib/world";
import { Harness } from "./ui/Harness";
import { BLOG_URL, X_URL } from "./ui/harness";
import { fetchHfStatus, requestHfTurn } from "./ui/hfClient";
import { Lane, type HfTurnState } from "./ui/Lane";
import { MetricsPanel, type LaneMetrics } from "./ui/MetricsPanel";

type LaneId = "slow" | "fast";
type LaneState = { run: Run; progressMs: number; runId: number };
type Lanes = Record<LaneId, LaneState | null>;

const LANE_IDS: readonly LaneId[] = ["slow", "fast"];
const EMPTY_LANES: Lanes = { slow: null, fast: null };

function readSaved(): Saved {
  try {
    return parseSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SAVED;
  }
}

function isFinished(lane: LaneState | null): boolean {
  return lane !== null && lane.progressMs >= lane.run.metrics.wallMs;
}

function advance(lanes: Lanes, deltaMs: number): Lanes {
  let changed = false;
  const next: Lanes = { ...lanes };
  for (const id of LANE_IDS) {
    const lane = lanes[id];
    if (lane === null || isFinished(lane)) continue;
    next[id] = { ...lane, progressMs: Math.min(lane.run.metrics.wallMs, lane.progressMs + deltaMs) };
    changed = true;
  }
  return changed ? next : lanes;
}

function laneMetrics(lane: LaneState | null, last: Metrics | null): LaneMetrics {
  if (lane === null) return last ? { kind: "last", metrics: last } : { kind: "none" };
  return isFinished(lane) ? { kind: "run", metrics: lane.run.metrics } : { kind: "running" };
}

export function App() {
  const [initial] = useState(readSaved);
  const [goalText, setGoalText] = useState(initial.goalText);
  const [skillText, setSkillText] = useState(initial.skillText);
  const [levers, setLevers] = useState<Levers>(initial.levers);
  const [modelMode, setModelMode] = useState<ModelMode>(initial.modelMode);
  const [speed, setSpeed] = useState<Speed>(initial.speed);
  const [lastMetrics, setLastMetrics] = useState(initial.lastMetrics);
  const [lanes, setLanes] = useState<Lanes>(EMPTY_LANES);
  const [hfStatus, setHfStatus] = useState<HfStatus | "loading">("loading");
  const [hfTurns, setHfTurns] = useState<ReadonlyMap<string, HfTurnState>>(new Map());
  const runCounter = useRef(0);
  const requestedTurns = useRef(new Set<string>());
  const speedRef = useRef(speed);

  const plannedSlow = useMemo(() => simulate(goalText, DEFAULT_WORLD, SLOW_LEVERS, skillText), [goalText, skillText]);
  const plannedFast = useMemo(() => simulate(goalText, DEFAULT_WORLD, levers, skillText), [goalText, skillText, levers]);
  const hfActive = modelMode === "hf" && hfStatus !== "loading" && hfStatus.enabled;

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let cancelled = false;
    void fetchHfStatus().then((status) => {
      if (!cancelled) setHfStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const saved: Saved = { goalText, skillText, levers, modelMode, speed, lastMetrics };
    try {
      if (JSON.stringify(saved) === JSON.stringify(DEFAULT_SAVED)) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage can be unavailable (private mode, quota); the app works without it.
    }
  }, [goalText, skillText, levers, modelMode, speed, lastMetrics]);

  const running = LANE_IDS.some((id) => lanes[id] !== null && !isFinished(lanes[id]));
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) * speedRef.current;
      last = now;
      setLanes((prev) => advance(prev, delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    for (const id of LANE_IDS) {
      const lane = lanes[id];
      if (lane && isFinished(lane) && lastMetrics[id] !== lane.run.metrics) {
        setLastMetrics((prev) => ({ ...prev, [id]: lane.run.metrics }));
      }
    }
  }, [lanes, lastMetrics]);

  useEffect(() => {
    if (!hfActive) return;
    for (const id of LANE_IDS) {
      const lane = lanes[id];
      if (!lane) continue;
      for (const event of lane.run.timeline) {
        if (event.kind !== "turn" || event.startMs >= lane.progressMs) continue;
        const key = `${lane.runId}:${event.stepIndex}`;
        const step = lane.run.steps[event.stepIndex];
        if (requestedTurns.current.has(key) || step?.kind !== "turn") continue;
        requestedTurns.current.add(key);
        const model = hfStatus.model;
        setHfTurns((prev) => new Map(prev).set(key, { status: "pending" }));
        void requestHfTurn({
          goal: lane.run.goal.text,
          lastResult: lastToolResult(lane.run.steps, event.stepIndex),
          fallback: step.text,
        }).then((res) => {
          const state: HfTurnState = res.ok
            ? { status: "ok", text: res.text, ms: res.ms, model }
            : { status: "error", error: res.error };
          setHfTurns((prev) => new Map(prev).set(key, state));
        });
      }
    }
  }, [lanes, hfActive, hfStatus]);

  const start = (ids: readonly LaneId[]) => {
    const patch: Partial<Lanes> = {};
    for (const id of ids) {
      runCounter.current += 1;
      const laneLevers = id === "slow" ? SLOW_LEVERS : levers;
      patch[id] = { run: simulate(goalText, DEFAULT_WORLD, laneLevers, skillText), progressMs: 0, runId: runCounter.current };
    }
    setLanes((prev) => ({ ...prev, ...patch }));
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setGoalText(DEFAULT_SAVED.goalText);
    setSkillText(DEFAULT_SAVED.skillText);
    setLevers(DEFAULT_SAVED.levers);
    setModelMode(DEFAULT_SAVED.modelMode);
    setSpeed(DEFAULT_SAVED.speed);
    setLastMetrics(DEFAULT_SAVED.lastMetrics);
    setLanes(EMPTY_LANES);
    setHfTurns(new Map());
    requestedTurns.current.clear();
  };

  const axisMs = Math.max(
    lanes.slow?.run.metrics.wallMs ?? plannedSlow.metrics.wallMs,
    lanes.fast?.run.metrics.wallMs ?? plannedFast.metrics.wallMs,
    1,
  );
  const rows = Math.max(
    1,
    ...[lanes.slow?.run ?? plannedSlow, lanes.fast?.run ?? plannedFast].flatMap((run) => run.timeline.map((e) => e.lane + 1)),
  );

  const hfTurnFor = (lane: LaneState | null) => (stepIndex: number) =>
    lane && hfActive ? hfTurns.get(`${lane.runId}:${stepIndex}`) : undefined;

  return (
    <div className="app">
      <header className="app-head">
        <div>
          <h1>Slow Assistant Lab</h1>
          <p className="subtitle">
            Why a dinner booking takes minutes for one agent and seconds for another: parallel checks, a pre-taught
            skill, and faster model turns.
          </p>
        </div>
        <ul className="rules" aria-label="Rules">
          <li>Simulation, not Cerebras API</li>
          <li>No real booking</li>
          <li>Fast path = parallel + skill (+ optional fast model)</li>
        </ul>
      </header>

      <form
        className="goal-bar panel"
        onSubmit={(e) => {
          e.preventDefault();
          start(LANE_IDS);
        }}
      >
        <label className="goal-field">
          <span className="goal-label">Goal</span>
          <input
            className="goal-input"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            spellCheck={false}
            aria-label="Goal"
          />
        </label>
        <div className="goal-actions">
          <button type="button" className="btn" onClick={() => start(["slow"])}>
            Run Slow
          </button>
          <button type="button" className="btn" onClick={() => start(["fast"])}>
            Run Fast
          </button>
          <button type="submit" className="btn primary">
            Run both
          </button>
          <label className="speed">
            <span className="muted">Speed</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(SPEEDS.find((s) => String(s) === e.target.value) ?? DEFAULT_SAVED.speed)}
              aria-label="Playback speed"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost" onClick={reset}>
            Reset
          </button>
        </div>
      </form>

      <main className="workspace">
        <Harness
          skillText={skillText}
          onSkillText={setSkillText}
          onRestoreSkill={() => setSkillText(SAMPLE_SKILL)}
          levers={levers}
          onLevers={setLevers}
          fastPreview={plannedFast.metrics}
          modelMode={modelMode}
          onModelMode={setModelMode}
          hfStatus={hfStatus}
        />
        <div className="lanes">
          <Lane
            tone="slow"
            title="Slow"
            levers={lanes.slow?.run.levers ?? SLOW_LEVERS}
            run={lanes.slow?.run ?? null}
            progressMs={lanes.slow?.progressMs ?? 0}
            axisMs={axisMs}
            rows={rows}
            hfTurn={hfTurnFor(lanes.slow)}
          />
          <Lane
            tone="fast"
            title="Fast"
            levers={lanes.fast?.run.levers ?? levers}
            run={lanes.fast?.run ?? null}
            progressMs={lanes.fast?.progressMs ?? 0}
            axisMs={axisMs}
            rows={rows}
            hfTurn={hfTurnFor(lanes.fast)}
          />
        </div>
      </main>

      <MetricsPanel slow={laneMetrics(lanes.slow, lastMetrics.slow)} fast={laneMetrics(lanes.fast, lastMetrics.fast)} />

      <footer className="app-foot">
        Inspired by Cerebras,{" "}
        <a href={BLOG_URL} target="_blank" rel="noreferrer">
          The rise of slow personal assistants
        </a>
        , and{" "}
        <a href={X_URL} target="_blank" rel="noreferrer">
          this post on X
        </a>
        . Every number in the lanes is simulated with fixed mock tool timings. No network, no booking.
      </footer>
    </div>
  );
}
