import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createGame, NO_INPUT, platesPressed, step, type GameState, type Inputs } from "../lib/game";
import { HEROES, LEVEL, type Hero } from "../lib/level";
import { CANVAS_H, CANVAS_W, drawGame } from "./render";
import type { PlayableStatus } from "./types";

export interface GameHandle {
  getState: () => GameState;
  snapshot: () => string;
  reset: () => void;
}

interface Props {
  solo: boolean;
  onStatus: (status: PlayableStatus) => void;
  onWin: () => void;
}

const DT = 1 / 60;
const KEYS: Record<Hero, { left: string; right: string; jump: string }> = {
  cinder: { left: "KeyA", right: "KeyD", jump: "KeyW" },
  drift: { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" },
};
const HANDLED = new Set(["Tab", ...HEROES.flatMap((h) => Object.values(KEYS[h]))]);

function statusOf(state: GameState): PlayableStatus {
  return {
    platePressed: platesPressed(state),
    latched: state.latched,
    doorOpen: state.doorOpen,
    deaths: state.deaths,
    won: state.status === "won",
  };
}

function sameStatus(a: PlayableStatus, b: PlayableStatus): boolean {
  return (
    a.platePressed === b.platePressed &&
    a.latched === b.latched &&
    a.doorOpen === b.doorOpen &&
    a.deaths === b.deaths &&
    a.won === b.won
  );
}

export const GameCanvas = forwardRef<GameHandle, Props>(function GameCanvas({ solo, onStatus, onWin }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGame(LEVEL));
  const soloRef = useRef(solo);
  const callbacks = useRef({ onStatus, onWin });
  const activeRef = useRef<Hero>("cinder");

  soloRef.current = solo;
  callbacks.current = { onStatus, onWin };

  useImperativeHandle(ref, () => ({
    getState: () => stateRef.current,
    snapshot: () => canvasRef.current?.toDataURL("image/png") ?? "",
    reset: () => {
      stateRef.current = createGame(LEVEL);
      activeRef.current = "cinder";
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const down = new Set<string>();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (!HANDLED.has(e.code)) return;
      if (e.code === "Tab" && !soloRef.current) return;
      e.preventDefault();
      if (e.code === "Tab" && !e.repeat) {
        activeRef.current = activeRef.current === "cinder" ? "drift" : "cinder";
        return;
      }
      down.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      down.delete(e.code);
    };
    const onBlur = (): void => down.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const read = (hero: Hero): Inputs[Hero] => ({
      left: down.has(KEYS[hero].left),
      right: down.has(KEYS[hero].right),
      jump: down.has(KEYS[hero].jump),
    });
    const readInputs = (): Inputs => {
      if (!soloRef.current) return { cinder: read("cinder"), drift: read("drift") };
      const merged = (a: Inputs[Hero], b: Inputs[Hero]) => ({
        left: a.left || b.left,
        right: a.right || b.right,
        jump: a.jump || b.jump,
      });
      const both = merged(read("cinder"), read("drift"));
      return activeRef.current === "cinder"
        ? { cinder: both, drift: NO_INPUT }
        : { cinder: NO_INPUT, drift: both };
    };

    let frame = 0;
    let last = performance.now();
    let acc = 0;
    let reportedWin = false;
    let lastStatus = statusOf(stateRef.current);
    callbacks.current.onStatus(lastStatus);

    const loop = (now: number): void => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= DT) {
        stateRef.current = step(stateRef.current, readInputs(), DT);
        acc -= DT;
      }
      const state = stateRef.current;
      drawGame(ctx, state, {
        style: "game",
        time: now / 1000,
        activeHero: soloRef.current ? activeRef.current : null,
      });

      const status = statusOf(state);
      if (!sameStatus(status, lastStatus)) {
        lastStatus = status;
        callbacks.current.onStatus(status);
      }
      if (state.status === "won" && !reportedWin) {
        reportedWin = true;
        callbacks.current.onWin();
      }
      if (state.status === "playing") reportedWin = false;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="play-canvas"
      width={CANVAS_W}
      height={CANVAS_H}
      aria-label="Game Builder Lab level: two heroes, a plate, a door and two exits"
    />
  );
});
