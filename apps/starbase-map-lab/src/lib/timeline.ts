/** Wrap into [0, loopLength). The exact end of a loop is the next countdown. */
export function wrapLoop(t: number, loopLengthS: number): number {
  if (!(loopLengthS > 0) || !Number.isFinite(t)) return 0;
  const mod = t % loopLengthS;
  return mod < 0 ? mod + loopLengthS : mod;
}

/** Scrubber domain is closed: values outside the loop clamp to the ends. */
export function clampScrub(t: number, loopLengthS: number): number {
  if (!Number.isFinite(t) || !(loopLengthS > 0)) return 0;
  if (t < 0) return 0;
  if (t > loopLengthS) return loopLengthS;
  return t;
}

/**
 * Advance the playhead. Pause holds t (still wrapped). Speed scales dt.
 * Playback wraps; it does not sit on the closed scrubber end.
 */
export function advance(
  t: number,
  dtSeconds: number,
  speed: number,
  paused: boolean,
  loopLengthS: number,
): number {
  const current = wrapLoop(t, loopLengthS);
  if (paused || !Number.isFinite(dtSeconds) || !Number.isFinite(speed)) return current;
  return wrapLoop(current + dtSeconds * speed, loopLengthS);
}

export function formatClock(missionT: number): string {
  const sign = missionT < 0 ? "T-" : "T+";
  const abs = Math.abs(missionT);
  const minutes = Math.floor(abs / 60);
  const seconds = Math.floor(abs % 60);
  return `${sign}${minutes}:${seconds.toString().padStart(2, "0")}`;
}
