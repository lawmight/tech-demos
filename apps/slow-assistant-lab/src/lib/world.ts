import type { Goal, World } from "./types";

export const SLOW_TURN_MS = 9000;
export const FAST_TURN_MS = 600;

export const DEFAULT_WORLD: World = {
  restaurants: [
    { name: "A Mano", slots: [], checkMs: 5200 },
    { name: "II Borgo", slots: [], checkMs: 6000 },
    { name: "Doppio Zero", slots: ["19:30"], checkMs: 4400 },
  ],
  requiredBookFields: ["restaurant", "party_size", "time", "name"],
  durations: { searchMs: 4000, bookMs: 8000, doneMs: 200 },
};

export const DEFAULT_GOAL_TEXT = "Book dinner for 2 tonight at one of: A Mano, II Borgo, Doppio Zero";

export const DEFAULT_GOAL: Goal = {
  text: DEFAULT_GOAL_TEXT,
  partySize: 2,
  candidates: ["A Mano", "II Borgo", "Doppio Zero"],
};
