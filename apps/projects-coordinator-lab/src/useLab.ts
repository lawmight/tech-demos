import { useEffect, useReducer } from "react";
import { hasWork, initialState, reduce, type Action } from "./lib/dispatch";
import { parseState, serializeState, STORAGE_KEY } from "./lib/persistence";
import type { LabState } from "./lib/types";

const BASE_TICK_MS = 700;

function load(): LabState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY)) ?? initialState();
  } catch {
    return initialState();
  }
}

export function useLab(): [LabState, (action: Action) => void] {
  const [state, dispatch] = useReducer(reduce, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(state));
    } catch {
      // Storage full or blocked. The thread still works for this session.
    }
  }, [state]);

  const working = hasWork(state);
  const { autoplay, speed } = state.settings;
  useEffect(() => {
    if (!autoplay || !working) return;
    const id = setInterval(() => dispatch({ type: "tick" }), BASE_TICK_MS / speed);
    return () => clearInterval(id);
  }, [autoplay, working, speed]);

  return [state, dispatch];
}
