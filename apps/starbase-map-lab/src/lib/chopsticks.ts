/** Degrees the arms swing out from the closed catch. */
export const ARM_OPEN_DEG = 62;
export const ARM_CLOSED_DEG = 4;

/** Mission seconds. Arms start closing before the catch and finish as the booster arrives. */
export const ARM_CLOSE_START_T = 400;
export const ARM_CLOSE_END_T = 420;

export function chopstickArmDeg(missionT: number): number {
  if (missionT < ARM_CLOSE_START_T) return ARM_OPEN_DEG;
  if (missionT >= ARM_CLOSE_END_T) return ARM_CLOSED_DEG;
  const u = (missionT - ARM_CLOSE_START_T) / (ARM_CLOSE_END_T - ARM_CLOSE_START_T);
  const smooth = u * u * (3 - 2 * u);
  return ARM_OPEN_DEG + (ARM_CLOSED_DEG - ARM_OPEN_DEG) * smooth;
}

export function armsClosed(missionT: number): boolean {
  return chopstickArmDeg(missionT) <= ARM_CLOSED_DEG + 0.001;
}
