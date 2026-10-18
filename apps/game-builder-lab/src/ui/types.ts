import type { Critique } from "../lib/frame";

/** Live facts about the running level, shown in the Playable stage. */
export interface PlayableStatus {
  platePressed: boolean;
  latched: boolean;
  doorOpen: boolean;
  deaths: number;
  won: boolean;
}

/** A Critic round: the verdict plus three same-size images as data URLs. */
export interface CriticRound {
  critique: Critique;
  reference: string;
  capture: string;
  diff: string;
}
