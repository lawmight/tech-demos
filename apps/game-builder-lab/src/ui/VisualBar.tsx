import type { ReactElement } from "react";
import {
  PLAN_ITEMS,
  STAGES,
  allPassed,
  canView,
  stageStatus,
  type Stage,
  type StageEvent,
  type StageState,
  type StageStatus,
} from "../lib/stages";
import type { CriticRound, PlayableStatus } from "./types";
import "./visual-bar.css";

export interface VisualBarProps {
  stages: StageState;
  dispatch: (e: StageEvent) => void;
  status: PlayableStatus;
  round: CriticRound | null;
  onCapture: () => void;
  onResetLevel: () => void;
}

const STAGE_LABEL: Record<Stage, string> = {
  brief: "Brief",
  plan: "Plan",
  playable: "Playable",
  critic: "Critic",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  done: "Done",
  current: "Current",
  locked: "Locked",
};

const percent = (score: number): string => `${Math.round(score * 100)}%`;

export function RulesStrip(): ReactElement {
  return (
    <ul className="vb-rules" aria-label="Project rules">
      <li className="vb-pill">Original homage, not Fireboy &amp; Watergirl</li>
      <li className="vb-pill">Simulation of game-builder stages, not the Cursor skill</li>
      <li className="vb-pill">Offline / no key</li>
    </ul>
  );
}

interface StageRailProps {
  stages: StageState;
  dispatch: (e: StageEvent) => void;
}

function StageRail({ stages, dispatch }: StageRailProps): ReactElement {
  return (
    <nav aria-label="Build stages">
      <ol className="vb-rail">
        {STAGES.map((stage, i) => {
          const status = stageStatus(stages, stage);
          const open = canView(stages, stage);
          const active = stages.viewing === stage;
          return (
            <li key={stage} className="vb-rail-item">
              <button
                type="button"
                className="vb-step"
                data-status={status}
                data-active={active}
                disabled={!open}
                aria-current={active ? "step" : undefined}
                onClick={() => dispatch({ type: "view", stage })}
              >
                <span className="vb-step-num" aria-hidden="true">
                  {status === "done" ? "\u2713" : i + 1}
                </span>
                <span className="vb-step-text">
                  <span className="vb-step-label">{STAGE_LABEL[stage]}</span>
                  <span className="vb-step-status">{STATUS_LABEL[status]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface BriefPanelProps {
  locked: boolean;
  dispatch: (e: StageEvent) => void;
}

function BriefPanel({ locked, dispatch }: BriefPanelProps): ReactElement {
  return (
    <div className="vb-panel-body">
      <h2 className="vb-title">Brief</h2>
      <p className="vb-text">
        Build a short co-op puzzle-platformer with two heroes, Cinder and Drift. Brine
        burns Cinder and ash burns Drift. One hero stands on a plate to open a door for the other. The
        hero past the door touches a lever that latches it open, so the first hero can follow.
        Both heroes reach their own exit to clear the level.
      </p>
      <p className="vb-hint">The reference frame is the solved level, door open, both heroes at their exits.</p>
      <div className="vb-actions">
        {locked ? (
          <span className="vb-badge" data-tone="pass">
            Brief locked
          </span>
        ) : (
          <button type="button" className="vb-btn" data-variant="primary" onClick={() => dispatch({ type: "lock-brief" })}>
            Lock brief
          </button>
        )}
      </div>
    </div>
  );
}

interface PlanPanelProps {
  plan: readonly boolean[];
  dispatch: (e: StageEvent) => void;
}

function PlanPanel({ plan, dispatch }: PlanPanelProps): ReactElement {
  const done = plan.filter(Boolean).length;
  return (
    <div className="vb-panel-body">
      <h2 className="vb-title">Plan</h2>
      <p className="vb-hint">
        {done} of {PLAN_ITEMS.length} steps ticked. Tick them all to open Playable.
      </p>
      <ul className="vb-checks">
        {PLAN_ITEMS.map((item, index) => (
          <li key={item}>
            <label className="vb-check">
              <input
                type="checkbox"
                checked={plan[index] === true}
                onChange={() => dispatch({ type: "toggle-plan", index })}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PlayablePanelProps {
  status: PlayableStatus;
  onCapture: () => void;
  onResetLevel: () => void;
}

function PlayablePanel({ status, onCapture, onResetLevel }: PlayablePanelProps): ReactElement {
  const chips: ReadonlyArray<{ label: string; on: boolean }> = [
    { label: "Plate pressed", on: status.platePressed },
    { label: "Door open", on: status.doorOpen },
    { label: "Lever latched", on: status.latched },
    { label: "Level cleared", on: status.won },
  ];
  return (
    <div className="vb-panel-body">
      <h2 className="vb-title">Playable</h2>
      <p className="vb-text">The Playable build is the canvas on the left. Play it, then send a frame to the Critic.</p>
      <ul className="vb-chips" aria-label="Live level status">
        {chips.map((chip) => (
          <li key={chip.label} className="vb-chip" data-on={chip.on}>
            {chip.label}
          </li>
        ))}
        <li className="vb-chip" data-on={status.deaths > 0} data-tone="warn">
          Deaths {status.deaths}
        </li>
      </ul>
      <p className="vb-hint">
        Cinder moves with <kbd>W</kbd> <kbd>A</kbd> <kbd>D</kbd>. Drift moves with the arrow keys.
      </p>
      <div className="vb-actions">
        <button type="button" className="vb-btn" data-variant="primary" onClick={onCapture}>
          Capture frame for Critic
        </button>
        <button type="button" className="vb-btn" onClick={onResetLevel}>
          Reset level
        </button>
      </div>
    </div>
  );
}

interface CriticPanelProps {
  round: CriticRound | null;
  celebrate: boolean;
  dispatch: (e: StageEvent) => void;
}

function CriticPanel({ round, celebrate, dispatch }: CriticPanelProps): ReactElement {
  if (round === null) {
    return (
      <div className="vb-panel-body">
        <h2 className="vb-title">Critic</h2>
        <p className="vb-text">No capture yet. Capture a frame in Playable first.</p>
      </div>
    );
  }
  const { critique } = round;
  const shots: ReadonlyArray<{ label: string; src: string; alt: string }> = [
    { label: "Reference", src: round.reference, alt: "Reference frame, the solved level" },
    { label: "Capture", src: round.capture, alt: "Capture of the live level" },
    { label: "Diff", src: round.diff, alt: "Difference between reference and capture, mismatched cells in red" },
  ];
  return (
    <div className="vb-panel-body">
      <h2 className="vb-title">Critic</h2>
      <ul className="vb-shots">
        {shots.map((shot) => (
          <li key={shot.label} className="vb-shot">
            <img className="vb-img" src={shot.src} alt={shot.alt} />
            <span className="vb-shot-label">{shot.label}</span>
          </li>
        ))}
      </ul>
      <div className="vb-verdict">
        <span className="vb-score" aria-label={`Overall score ${percent(critique.score)}`}>
          {percent(critique.score)}
        </span>
        <span className="vb-badge" data-tone={critique.pass ? "pass" : "fail"}>
          {critique.pass ? "PASS" : "FAIL"}
        </span>
      </div>
      <ul className="vb-findings">
        {critique.findings.map((f) => (
          <li key={f.label} className="vb-finding" data-pass={f.pass}>
            <span className="vb-mark" aria-label={f.pass ? "Pass" : "Fail"}>
              {f.pass ? "\u2713" : "\u2717"}
            </span>
            <span className="vb-finding-main">
              <span className="vb-finding-label">{f.label}</span>
              <span className="vb-finding-note">{f.note}</span>
            </span>
            <span className="vb-finding-score">{percent(f.score)}</span>
          </li>
        ))}
      </ul>
      {!critique.pass && (
        <div className="vb-actions">
          <button
            type="button"
            className="vb-btn"
            data-variant="primary"
            onClick={() => dispatch({ type: "view", stage: "playable" })}
          >
            Back to Playable
          </button>
          <span className="vb-hint">Play on, then capture again.</span>
        </div>
      )}
      {celebrate && (
        <p className="vb-banner" role="status">
          All gates passed
        </p>
      )}
    </div>
  );
}

export function VisualBar({ stages, dispatch, status, round, onCapture, onResetLevel }: VisualBarProps): ReactElement {
  const panel = ((): ReactElement => {
    switch (stages.viewing) {
      case "brief":
        return <BriefPanel locked={stages.briefLocked} dispatch={dispatch} />;
      case "plan":
        return <PlanPanel plan={stages.plan} dispatch={dispatch} />;
      case "playable":
        return <PlayablePanel status={status} onCapture={onCapture} onResetLevel={onResetLevel} />;
      case "critic":
        return <CriticPanel round={round} celebrate={allPassed(stages)} dispatch={dispatch} />;
      default: {
        const unreachable: never = stages.viewing;
        return unreachable;
      }
    }
  })();

  return (
    <section className="vb" aria-label="Visual Bar">
      <StageRail stages={stages} dispatch={dispatch} />
      <div className="vb-panel">{panel}</div>
    </section>
  );
}
