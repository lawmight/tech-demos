import type { ProviderProfile, Replay, Session } from "../lib/types";
import { formatClock } from "./format";

export function ReplayStage({
  session,
  lanes,
  nowMs,
  maxMs,
  playing,
  speed,
  ttlChoice,
  extendedAvailable,
  onScrub,
  onToggle,
  onSpeed,
  onStep,
  onTtl,
}: {
  session: Session;
  lanes: Array<{ profile: ProviderProfile; replay: Replay }>;
  nowMs: number;
  maxMs: number;
  playing: boolean;
  speed: 1 | 10 | 60;
  ttlChoice: "default" | "extended";
  extendedAvailable: boolean;
  onScrub: (ms: number) => void;
  onToggle: () => void;
  onSpeed: (speed: 1 | 10 | 60) => void;
  onStep: () => void;
  onTtl: (choice: "default" | "extended") => void;
}) {
  return (
    <section className="stage" aria-label="Side by side replay">
      <header className="panel-head">
        <h2>{session.title}</h2>
        <p className="clock">{formatClock(nowMs)}</p>
      </header>
      <div className="transport">
        <button type="button" onClick={onToggle}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={onStep}>
          Step
        </button>
        {([1, 10, 60] as const).map((value) => (
          <button key={value} type="button" aria-pressed={speed === value} onClick={() => onSpeed(value)}>
            {value}×
          </button>
        ))}
        <button type="button" aria-pressed={ttlChoice === "default"} onClick={() => onTtl("default")}>
          Default TTL
        </button>
        <button
          type="button"
          aria-pressed={ttlChoice === "extended"}
          disabled={!extendedAvailable}
          onClick={() => onTtl("extended")}
        >
          Extended TTL
        </button>
        <input
          className="scrub"
          type="range"
          min={0}
          max={maxMs}
          value={Math.min(nowMs, maxMs)}
          aria-label="Replay position"
          onChange={(event) => onScrub(Number(event.target.value))}
        />
      </div>
      <div className="lanes">
        {lanes.map(({ profile, replay }) => (
          <Lane key={profile.id} profile={profile} replay={replay} />
        ))}
      </div>
    </section>
  );
}

function Lane({ profile, replay }: { profile: ProviderProfile; replay: Replay }) {
  const warmth = replay.warmth;
  const percent = warmth.status === "warm" ? Math.max(0, Math.min(100, (warmth.remainingMs / warmth.ttlMs) * 100)) : 0;
  return (
    <article className="lane" data-provider={profile.id}>
      <header>
        <h3>{profile.label}</h3>
        <p>{profile.model}</p>
      </header>
      {warmth.status === "unknown" ? (
        <p className="unknown-ttl">TTL unknown</p>
      ) : (
        <div
          className="meter"
          role="meter"
          aria-label={`${profile.label} cache remaining`}
          aria-valuemin={0}
          aria-valuemax={warmth.ttlMs}
          aria-valuenow={warmth.status === "warm" ? warmth.remainingMs : 0}
        >
          <div className={warmth.status === "cold" ? "fill cold" : "fill"} style={{ width: `${percent}%` }} />
          <span>
            {warmth.status === "cold" ? "cold" : formatClock(warmth.remainingMs)} / {formatClock(warmth.ttlMs)}
          </span>
        </div>
      )}
      <ol className="markers">
        {replay.turns.map((turn) => (
          <li key={turn.id} data-marker={turn.marker}>
            <span>{turn.marker}</span>
            {turn.label}
          </li>
        ))}
      </ol>
    </article>
  );
}
