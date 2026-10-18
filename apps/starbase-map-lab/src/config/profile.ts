import type { LngLat, PhaseId, Sample } from "../lib/types";

/**
 * Approximate, stylized profile. Timings are round marks near public Flight 5
 * callouts (staging around two and a half minutes, catch around seven minutes),
 * not a telemetry reconstruction. See README.
 */
export const AZIMUTH_DEG = 97;

/** Vehicle centerline on the orbital mount, nudged east of OSM tower 968227813. */
export const PAD: LngLat = { lat: 25.996142, lng: -97.154559 };

/** Integration Tower 1 mast, west of the mount. Metres in local east/north. */
export const TOWER_OFFSET_M = { eastM: -18, northM: 0 };

export const BOOSTER_HEIGHT_M = 71;
export const SHIP_HEIGHT_M = 50;
export const TOWER_HEIGHT_M = 146;
/** Arm pivot height. With the booster base at the catch altitude, this meets the lift pins. */
export const ARM_PIVOT_M = 93;
export const CATCH_ALTITUDE_M = 29;
export const CATCH_MISSION_T = 420;

export const COUNTDOWN_S = 12;
export const LOOP_END_MISSION_T = 540;
export const LOOP_LENGTH_S = COUNTDOWN_S + LOOP_END_MISSION_T;

export const STAGING: Sample = {
  t: 160,
  downrangeM: 32_000,
  altitudeM: 69_000,
  pitchDeg: 28,
};

export const ASCENT: readonly Sample[] = [
  { t: 0, downrangeM: 0, altitudeM: 0, pitchDeg: 90 },
  { t: 20, downrangeM: 350, altitudeM: 1_800, pitchDeg: 82 },
  { t: 60, downrangeM: 4_200, altitudeM: 11_500, pitchDeg: 64 },
  { t: 110, downrangeM: 15_000, altitudeM: 38_000, pitchDeg: 42 },
  STAGING,
];

export const BOOSTER_RETURN: readonly Sample[] = [
  STAGING,
  { t: 175, downrangeM: 33_800, altitudeM: 74_500, pitchDeg: 0 },
  { t: 210, downrangeM: 22_000, altitudeM: 68_000, pitchDeg: -55 },
  { t: 240, downrangeM: 9_000, altitudeM: 48_000, pitchDeg: -25 },
  { t: 320, downrangeM: 1_800, altitudeM: 18_000, pitchDeg: 35 },
  { t: 390, downrangeM: 120, altitudeM: 3_200, pitchDeg: 78 },
  { t: 415, downrangeM: 6, altitudeM: 180, pitchDeg: 88 },
  { t: CATCH_MISSION_T, downrangeM: 0, altitudeM: CATCH_ALTITUDE_M, pitchDeg: 90 },
  { t: LOOP_END_MISSION_T, downrangeM: 0, altitudeM: CATCH_ALTITUDE_M, pitchDeg: 90 },
];

export const PHASES: readonly { id: PhaseId; startS: number; endS: number }[] = [
  { id: "countdown", startS: 0, endS: 12 },
  { id: "liftoff", startS: 12, endS: 72 },
  { id: "max-q", startS: 72, endS: 172 },
  { id: "hot-staging", startS: 172, endS: 187 },
  { id: "boostback", startS: 187, endS: 252 },
  { id: "booster-coast", startS: 252, endS: 402 },
  { id: "landing-burn", startS: 402, endS: 427 },
  { id: "catch", startS: 427, endS: 442 },
  { id: "ship-coast", startS: 442, endS: LOOP_LENGTH_S },
];

export const SPEEDS = [1, 5, 20, 60] as const;
export const MODEL_SCALES = [1, 10, 30] as const;
export const DEFAULT_MODEL_SCALE = 10;

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
