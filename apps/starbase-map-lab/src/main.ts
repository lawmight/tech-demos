import {
  AttributionControl,
  LngLat,
  Map,
  NavigationControl,
  type LngLatLike,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AZIMUTH_DEG,
  BOOSTER_HEIGHT_M,
  DEFAULT_MODEL_SCALE,
  LOOP_LENGTH_S,
  MODEL_SCALES,
  OPENFREEMAP_STYLE,
  PAD,
  PHASES,
  SHIP_HEIGHT_M,
  SPEEDS,
} from "./config/profile";
import { destination } from "./lib/geo";
import { stateAt } from "./lib/profile";
import { advance, clampScrub } from "./lib/timeline";
import type { FlightState, VehicleState } from "./lib/types";
import { createVehicleLayer, shipRenderLeadM, type Frame } from "./scene/layer";
import { offlineStyle } from "./scene/offline-style";
import "./style.css";

type CameraMode = "pad" | "chase" | "coastline";
type ChaseTarget = "ship" | "booster";

const params = new URLSearchParams(window.location.search);
const forceOffline = params.get("offline") === "1";

const phaseEl = required("#phase");
const clockEl = required("#clock");
const noticeEl = required("#notice");
const playButton = requiredButton("#play");
const scrub = requiredInput("#scrub");
const tickRow = required("#ticks");
const chaseToggle = required("#chase-toggle");

let t = clampScrub(numberParam("t", 0), LOOP_LENGTH_S);
let playing = params.get("paused") !== "1";
let speed = pick(SPEEDS, numberParam("speed", 1), 1);
let modelScale = pick(MODEL_SCALES, numberParam("scale", DEFAULT_MODEL_SCALE), DEFAULT_MODEL_SCALE);
let mode: CameraMode = pickMode(params.get("cam"));
let chaseTarget: ChaseTarget = params.get("chase") === "booster" ? "booster" : "ship";
let scrubbing = false;
let offline = forceOffline;
let sawStyle = forceOffline;
let lastFrame = performance.now();

const frame: Frame = { state: stateAt(t), modelScale };

scrub.max = String(LOOP_LENGTH_S);
scrub.value = String(t);
paintReadout(frame.state);
paintPressed();
buildTicks();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const flyMs = reduceMotion ? 0 : 1400;

const map = new Map({
  container: "map",
  style: (forceOffline ? offlineStyle() : OPENFREEMAP_STYLE) as string | StyleSpecification,
  center: [PAD.lng, PAD.lat],
  zoom: 16.65,
  pitch: 68,
  bearing: 55,
  maxPitch: 80,
  attributionControl: false,
  canvasContextAttributes: { antialias: true },
  fadeDuration: 0,
});

map.addControl(new AttributionControl({ compact: false }), "bottom-left");
map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");

const layer = createVehicleLayer(() => frame);
map.on("style.load", () => {
  if (map.getLayer("starbase-vehicles")) map.removeLayer("starbase-vehicles");
  map.addLayer(layer);
});

if (!forceOffline) {
  const timer = window.setTimeout(() => {
    if (!sawStyle) enterOffline();
  }, 8000);
  map.on("style.load", () => {
    sawStyle = true;
    window.clearTimeout(timer);
  });
  map.on("error", (event) => {
    if (offline || sawStyle) return;
    const message = event.error instanceof Error ? event.error.message : String(event.error);
    if (/style|ajax|fetch|network/i.test(message)) enterOffline();
  });
} else {
  noticeEl.hidden = false;
}

wireControls();
applyCamera(true);
requestAnimationFrame(tick);

function tick(now: number): void {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!scrubbing) {
    const next = advance(t, dt, speed, !playing, LOOP_LENGTH_S);
    const wrapped = next + 0.5 < t;
    t = next;
    scrub.value = String(t);
    if (wrapped && mode === "chase") snapChase();
  }
  frame.state = stateAt(t);
  frame.modelScale = modelScale;
  paintReadout(frame.state);
  if (mode === "chase" && !map.isMoving()) followChase();
  requestAnimationFrame(tick);
}

function enterOffline(): void {
  if (offline) return;
  offline = true;
  noticeEl.hidden = false;
  map.setStyle(offlineStyle());
}

function wireControls(): void {
  playButton.addEventListener("click", () => {
    playing = !playing;
    paintPressed();
  });
  scrub.addEventListener("pointerdown", () => {
    scrubbing = true;
  });
  scrub.addEventListener("pointerup", () => {
    scrubbing = false;
  });
  scrub.addEventListener("change", () => {
    scrubbing = false;
  });
  scrub.addEventListener("input", () => {
    t = clampScrub(Number(scrub.value), LOOP_LENGTH_S);
    frame.state = stateAt(t);
    paintReadout(frame.state);
    if (mode === "chase") snapChase();
  });
  bindSpeeds();
  bindScales();
  requiredButton("#cam-pad").addEventListener("click", () => setMode("pad"));
  requiredButton("#cam-chase").addEventListener("click", () => setMode("chase"));
  requiredButton("#cam-coast").addEventListener("click", () => setMode("coastline"));
  requiredButton("#chase-ship").addEventListener("click", () => setChase("ship"));
  requiredButton("#chase-booster").addEventListener("click", () => setChase("booster"));
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    playing = !playing;
    paintPressed();
  });
}

function bindSpeeds(): void {
  for (const value of SPEEDS) {
    requiredButton(`#speed-${value}`).addEventListener("click", () => {
      speed = value;
      paintPressed();
    });
  }
}

function bindScales(): void {
  for (const value of MODEL_SCALES) {
    requiredButton(`#scale-${value}`).addEventListener("click", () => {
      modelScale = value;
      paintPressed();
      if (mode === "chase") snapChase();
      else applyCamera(false);
    });
  }
}

function setMode(next: CameraMode): void {
  mode = next;
  paintPressed();
  applyCamera(false);
}

function setChase(next: ChaseTarget): void {
  chaseTarget = next;
  paintPressed();
  if (mode !== "chase") setMode("chase");
  else snapChase();
}

function applyCamera(immediate: boolean): void {
  // Without terrain, MapLibre zeroes center elevation every frame unless this is off.
  map.setCenterClampedToGround(mode !== "chase");
  const view = cameraView(mode, frame.state);
  if (immediate || flyMs === 0) {
    map.jumpTo(view);
    return;
  }
  map.flyTo({ ...view, duration: flyMs, essential: true });
}

function followChase(): void {
  map.setCenterClampedToGround(false);
  map.jumpTo(cameraView("chase", frame.state));
}

function snapChase(): void {
  if (mode !== "chase") return;
  map.jumpTo(cameraView("chase", stateAt(t)));
}

type CameraView = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  elevation: number;
};

function cameraView(which: CameraMode, flight: FlightState): CameraView {
  if (which === "pad") {
    return {
      center: [PAD.lng, PAD.lat],
      zoom: clamp(16.4 - Math.log2(Math.max(modelScale, 1)) * 0.72, 13.5, 17.15),
      pitch: 64,
      bearing: 48,
      elevation: 48 * modelScale,
    };
  }
  if (which === "coastline") {
    const look = destination(PAD, 3_200, AZIMUTH_DEG);
    return {
      center: [look.lng, look.lat],
      zoom: clamp(13.05 - Math.log2(Math.max(modelScale, 1)) * 0.22, 12.1, 13.6),
      pitch: 61,
      bearing: AZIMUTH_DEG - 18,
      elevation: 160 + 42 * modelScale,
    };
  }
  const vehicle = chaseTarget === "booster" ? flight.booster : flight.ship;
  return chaseView(vehicle);
}

/** Look at the vehicle body. Elevation is the look-point altitude, so the mesh stays in frame at 70–190 km. */
function chaseView(vehicle: VehicleState): CameraView {
  const body = chaseTarget === "ship" ? SHIP_HEIGHT_M : BOOSTER_HEIGHT_M;
  const lead = chaseTarget === "ship" ? shipRenderLeadM(modelScale) : 0;
  const nose = (vehicle.pitchDeg * Math.PI) / 180;
  const along = lead + body * modelScale * 0.4;
  const look = destination(vehicle, Math.max(0, along * Math.cos(nose)), AZIMUTH_DEG);
  const lookAlt = Math.max(20, vehicle.altitudeM + along * Math.sin(nose));
  const span = Math.max(48, body * modelScale);
  const cam = destination(look, span * 3.8, AZIMUTH_DEG + 168);
  const solved = map.calculateCameraOptionsFromTo(
    new LngLat(cam.lng, cam.lat),
    lookAlt + span * 1.2,
    new LngLat(look.lng, look.lat),
    lookAlt,
  );
  const center = solved.center ? lngLatPair(solved.center) : ([look.lng, look.lat] as [number, number]);
  return {
    center,
    zoom: clamp(solved.zoom ?? 14, 6, 18.5),
    pitch: clamp(solved.pitch ?? 52, 18, 78),
    bearing: solved.bearing ?? AZIMUTH_DEG,
    elevation: solved.elevation ?? lookAlt,
  };
}

function lngLatPair(value: LngLatLike): [number, number] {
  if (Array.isArray(value)) return [value[0] ?? 0, value[1] ?? 0];
  if ("lng" in value) return [value.lng, value.lat];
  return [value.lon, value.lat];
}

function paintReadout(flight: FlightState): void {
  phaseEl.textContent = flight.phaseLabel;
  clockEl.textContent = flight.clock;
  chaseToggle.classList.toggle("is-dim", mode !== "chase");
}

function paintPressed(): void {
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.setAttribute("aria-pressed", playing ? "true" : "false");
  press("#cam-pad", mode === "pad");
  press("#cam-chase", mode === "chase");
  press("#cam-coast", mode === "coastline");
  press("#chase-ship", chaseTarget === "ship");
  press("#chase-booster", chaseTarget === "booster");
  for (const value of SPEEDS) press(`#speed-${value}`, speed === value);
  for (const value of MODEL_SCALES) press(`#scale-${value}`, modelScale === value);
}

function buildTicks(): void {
  for (const phase of PHASES) {
    const mark = document.createElement("span");
    mark.style.left = `${(phase.startS / LOOP_LENGTH_S) * 100}%`;
    mark.title = phase.id;
    tickRow.append(mark);
  }
}

function press(selector: string, on: boolean): void {
  requiredButton(selector).setAttribute("aria-pressed", on ? "true" : "false");
}

function required(selector: string): HTMLElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLButtonElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function requiredInput(selector: string): HTMLInputElement {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLInputElement)) throw new Error(`Missing ${selector}`);
  return node;
}

function numberParam(key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function pick<T extends number>(options: readonly T[], value: number, fallback: T): T {
  for (const option of options) {
    if (option === value) return option;
  }
  return fallback;
}

function pickMode(value: string | null): CameraMode {
  if (value === "chase" || value === "coastline" || value === "pad") return value;
  return "pad";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
