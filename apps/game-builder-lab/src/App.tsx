import { useCallback, useReducer, useRef, useState } from "react";
import { capture, solvedState } from "./lib/frame";
import { initialStages, reduceStages } from "./lib/stages";
import { GameCanvas, type GameHandle } from "./ui/GameCanvas";
import { renderToDataUrl } from "./ui/render";
import type { CriticRound, PlayableStatus } from "./ui/types";
import { RulesStrip, VisualBar } from "./ui/VisualBar";

const IDLE_STATUS: PlayableStatus = {
  platePressed: false,
  latched: false,
  doorOpen: false,
  deaths: 0,
  won: false,
};

export function App() {
  const [stages, dispatch] = useReducer(reduceStages, undefined, initialStages);
  const [status, setStatus] = useState<PlayableStatus>(IDLE_STATUS);
  const [round, setRound] = useState<CriticRound | null>(null);
  const [solo, setSolo] = useState(false);
  const game = useRef<GameHandle>(null);

  const sendToCritic = useCallback(() => {
    const handle = game.current;
    if (!handle) return;
    const state = handle.getState();
    const critique = capture(state);
    setRound({
      critique,
      reference: renderToDataUrl(solvedState(state), { style: "blueprint" }),
      capture: handle.snapshot(),
      diff: renderToDataUrl(state, { style: "blueprint", diffCells: critique.diffCells }),
    });
    dispatch({ type: "captured", verdict: { pass: critique.pass, score: critique.score } });
  }, []);

  const resetLevel = useCallback(() => {
    game.current?.reset();
    setRound(null);
    dispatch({ type: "reset-level" });
  }, []);

  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <h1>Game Builder Lab</h1>
          <p>
            A tiny co-op puzzle-platformer with a Visual Bar that walks Brief, Plan, Playable and Critic.
          </p>
        </div>
        <RulesStrip />
      </header>

      <main className="workbench">
        <section className="play" aria-label="Playable build">
          <div className="play-frame">
            <GameCanvas ref={game} solo={solo} onStatus={setStatus} onWin={sendToCritic} />
            {status.won && (
              <div className="win-banner" role="status">
                <strong>Level cleared</strong>
                <span>Both heroes made it out. The Critic has your capture.</span>
              </div>
            )}
          </div>
          <div className="play-toolbar">
            <span className="keys">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>D</kbd> Cinder
            </span>
            <span className="keys">
              <kbd>↑</kbd>
              <kbd>←</kbd>
              <kbd>→</kbd> Drift
            </span>
            <label className="toggle">
              <input type="checkbox" checked={solo} onChange={(e) => setSolo(e.target.checked)} />
              Solo (<kbd>Tab</kbd> swaps hero)
            </label>
            <button type="button" className="ghost" onClick={resetLevel}>
              Reset level
            </button>
          </div>
        </section>

        <VisualBar
          stages={stages}
          dispatch={dispatch}
          status={status}
          round={round}
          onCapture={sendToCritic}
          onResetLevel={resetLevel}
        />
      </main>
    </div>
  );
}
