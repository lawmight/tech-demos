import {
  ASCENT,
  AZIMUTH_DEG,
  BOOSTER_HEIGHT_M,
  BOOSTER_RETURN,
  CATCH_ALTITUDE_M,
  CATCH_MISSION_T,
  COUNTDOWN_S,
  LOOP_END_MISSION_T,
  LOOP_LENGTH_S,
  PAD,
  PHASES,
  STAGING,
} from "../config/profile";
import { chopstickArmDeg } from "./chopsticks";
import { destination, enuFromDownrange } from "./geo";
import { pchip } from "./interpolate";
import { formatClock, wrapLoop } from "./timeline";
import type { FlightState, PhaseId, Sample, VehicleState } from "./types";

const pitch = (STAGING.pitchDeg * Math.PI) / 180;
const SHIP_STAGING: Sample = {
  t: STAGING.t,
  downrangeM: STAGING.downrangeM + BOOSTER_HEIGHT_M * Math.cos(pitch),
  altitudeM: STAGING.altitudeM + BOOSTER_HEIGHT_M * Math.sin(pitch),
  pitchDeg: STAGING.pitchDeg,
};

const SHIP_COAST: readonly Sample[] = [
  SHIP_STAGING,
  { t: 175, downrangeM: 37_000, altitudeM: 78_000, pitchDeg: 24 },
  { t: 260, downrangeM: 72_000, altitudeM: 120_000, pitchDeg: 14 },
  { t: 400, downrangeM: 112_000, altitudeM: 160_000, pitchDeg: 8 },
  { t: 510, downrangeM: 142_000, altitudeM: 186_000, pitchDeg: 4 },
  { t: LOOP_END_MISSION_T, downrangeM: 156_000, altitudeM: 192_000, pitchDeg: 3 },
];

export function phaseLabel(phase: PhaseId): string {
  switch (phase) {
    case "countdown":
      return "Countdown";
    case "liftoff":
      return "Liftoff";
    case "max-q":
      return "Max-Q";
    case "hot-staging":
      return "Hot staging";
    case "boostback":
      return "Boostback";
    case "booster-coast":
      return "Booster coast";
    case "landing-burn":
      return "Landing burn";
    case "catch":
      return "Chopstick catch";
    case "ship-coast":
      return "Ship coast";
    default: {
      const unknown: never = phase;
      return unknown;
    }
  }
}

/** Map a loop time onto the half-open playback range, keeping the scrubber's end on the coast. */
export function seekSeconds(t: number): number {
  if (t === LOOP_LENGTH_S) return LOOP_LENGTH_S - 1e-4;
  return wrapLoop(t, LOOP_LENGTH_S);
}

export function phaseAt(t: number): PhaseId {
  const u = seekSeconds(t);
  for (const phase of PHASES) {
    if (u >= phase.startS && u < phase.endS) return phase.id;
  }
  return "ship-coast";
}

export function offsetAlongNose(sample: Sample, distanceM: number): Sample {
  const elevation = (sample.pitchDeg * Math.PI) / 180;
  return {
    t: sample.t,
    downrangeM: sample.downrangeM + distanceM * Math.cos(elevation),
    altitudeM: sample.altitudeM + distanceM * Math.sin(elevation),
    pitchDeg: sample.pitchDeg,
  };
}

function sampleSeries(keys: readonly Sample[], missionT: number): Sample {
  const times = keys.map((key) => key.t);
  return {
    t: missionT,
    downrangeM: pchip(times, keys.map((key) => key.downrangeM), missionT),
    altitudeM: pchip(times, keys.map((key) => key.altitudeM), missionT),
    pitchDeg: pchip(times, keys.map((key) => key.pitchDeg), missionT),
  };
}

function boosterSample(missionT: number): Sample {
  if (missionT <= STAGING.t) return sampleSeries(ASCENT, Math.max(0, missionT));
  return sampleSeries(BOOSTER_RETURN, missionT);
}

function shipSample(missionT: number): Sample {
  const clamped = Math.max(0, missionT);
  if (clamped <= STAGING.t) return offsetAlongNose(sampleSeries(ASCENT, clamped), BOOSTER_HEIGHT_M);
  return sampleSeries(SHIP_COAST, clamped);
}

function boosterEngines(missionT: number): boolean {
  if (missionT < 0) return false;
  if (missionT < STAGING.t) return true;
  if (missionT >= 168 && missionT < 240) return true;
  if (missionT >= 392 && missionT < CATCH_MISSION_T) return true;
  return false;
}

function shipEngines(missionT: number): boolean {
  return missionT >= 0 && missionT < 510;
}

function toVehicle(sample: Sample, enginesOn: boolean): VehicleState {
  const enu = enuFromDownrange(sample.downrangeM, AZIMUTH_DEG);
  const lngLat = destination(PAD, Math.max(0, sample.downrangeM), AZIMUTH_DEG);
  return {
    downrangeM: sample.downrangeM,
    altitudeM: sample.altitudeM,
    eastM: enu.eastM,
    northM: enu.northM,
    lng: lngLat.lng,
    lat: lngLat.lat,
    pitchDeg: sample.pitchDeg,
    enginesOn,
  };
}

/** Deterministic flight state. The map, cameras, and 3D layer only read this. */
export function stateAt(tSeconds: number): FlightState {
  const t = seekSeconds(tSeconds);
  const missionT = t - COUNTDOWN_S;
  const phase = phaseAt(t);
  const booster = boosterSample(missionT);
  const ship = shipSample(missionT);
  return {
    t,
    missionT,
    loopLengthS: LOOP_LENGTH_S,
    phase,
    phaseLabel: phaseLabel(phase),
    clock: formatClock(missionT),
    armDeg: chopstickArmDeg(missionT),
    hotStageFlash: missionT >= STAGING.t && missionT < 168,
    booster: toVehicle(booster, boosterEngines(missionT)),
    ship: toVehicle(ship, shipEngines(missionT)),
  };
}

export function catchPoint(): { lng: number; lat: number; altitudeM: number } {
  return { lng: PAD.lng, lat: PAD.lat, altitudeM: CATCH_ALTITUDE_M };
}
