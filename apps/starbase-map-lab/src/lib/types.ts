export type PhaseId =
  | "countdown"
  | "liftoff"
  | "max-q"
  | "hot-staging"
  | "boostback"
  | "booster-coast"
  | "landing-burn"
  | "catch"
  | "ship-coast";

export type LngLat = {
  lng: number;
  lat: number;
};

export type VehicleState = {
  downrangeM: number;
  altitudeM: number;
  eastM: number;
  northM: number;
  lng: number;
  lat: number;
  /** Nose elevation. 90 is straight up, 0 is horizontal along the azimuth. */
  pitchDeg: number;
  enginesOn: boolean;
};

export type FlightState = {
  /** Seconds from the start of the loop, in [0, loopLength]. */
  t: number;
  /** Seconds after liftoff. Negative during the countdown. */
  missionT: number;
  loopLengthS: number;
  phase: PhaseId;
  phaseLabel: string;
  clock: string;
  /** Chopstick opening, degrees. Larger is swung wider. */
  armDeg: number;
  hotStageFlash: boolean;
  booster: VehicleState;
  ship: VehicleState;
};

export type Sample = {
  t: number;
  downrangeM: number;
  altitudeM: number;
  pitchDeg: number;
};
