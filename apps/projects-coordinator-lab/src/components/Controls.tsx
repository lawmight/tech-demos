import type { Action } from "../lib/dispatch";
import type { Settings } from "../lib/types";

interface Props {
  settings: Settings;
  hasThread: boolean;
  dispatch: (action: Action) => void;
}

const SPEEDS: readonly Settings["speed"][] = [1, 2, 4];

export function Controls({ settings, hasThread, dispatch }: Props) {
  return (
    <div className="controls">
      <label className="check">
        <input
          type="checkbox"
          checked={settings.autoplay}
          onChange={(e) => dispatch({ type: "settings", patch: { autoplay: e.target.checked } })}
        />
        Auto-run
      </label>
      <button type="button" className="btn" disabled={settings.autoplay} onClick={() => dispatch({ type: "tick" })}>
        Step
      </button>
      <div className="seg" role="group" aria-label="Speed">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={settings.speed === speed ? "seg-btn on" : "seg-btn"}
            onClick={() => dispatch({ type: "settings", patch: { speed } })}
          >
            {speed}x
          </button>
        ))}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={settings.failure}
          onChange={(e) => dispatch({ type: "settings", patch: { failure: e.target.checked } })}
        />
        Inject a failure
      </label>
      <button type="button" className="btn danger" disabled={!hasThread} onClick={() => dispatch({ type: "reset" })}>
        Reset thread
      </button>
    </div>
  );
}
