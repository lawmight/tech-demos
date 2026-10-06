import {
  AttributionControl,
  Map,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AZIMUTH_DEG,
  DEFAULT_MODEL_SCALE,
  LOOP_LENGTH_S,
  MODEL_SCALES,
  OPENFREEMAP_STYLE,
  PAD,
  PHASES,
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
let sawIdle = false;
let tileErrors = 0;
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
    if (!sawIdle) enterOffline();
  }, 8000);
  map.on("idle", () => {
    sawIdle = true;
    window.clearTimeout(timer);
  });
  map.on("error", (event) => {
    if (offline) return;
    tileErrors += 1;
    const message = event.error instanceof Error ? event.error.message : String(event.error);
    const styleFailed = !map.isStyleLoaded() && /fail|style|ajax|fetch|network/i.test(message);
    if (styleFailed || (!sawIdle && tileErrors >= 8)) enterOffline();
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
  if (mode === "chase" && !map.isMoving()) followChase(dt);
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
  const view = cameraView(mode, frame.state);
  if (immediate || flyMs === 0) {
    map.jumpTo(view);
    return;
  }
  map.flyTo({ ...view, duration: flyMs, essential: true });
}

function followChase(dt: number): void {
  const view = cameraView("chase", frame.state);
  const center = map.getCenter();
  const currentBearing = map.getBearing();
  const k = 1 - Math.exp(-4.2 * dt);
  const bearingDelta = wrapDegrees(view.bearing - currentBearing);
  map.jumpTo({
    center: [
      center.lng + (view.center[0] - center.lng) * k,
      center.lat + (view.center[1] - center.lat) * k,
    ],
    zoom: map.getZoom() + (view.zoom - map.getZoom()) * k,
    pitch: map.getPitch() + (view.pitch - map.getPitch()) * k,
    bearing: currentBearing + bearingDelta * k,
  });
}

function snapChase(): void {
  if (mode !== "chase") return;
  map.jumpTo(cameraView("chase", stateAt(t)));
}

function cameraView(which: CameraMode, flight: FlightState): {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
} {
  if (which === "pad") {
    return { center: [PAD.lng, PAD.lat], zoom: 16.7, pitch: 68, bearing: 55 };
  }
  if (which === "coastline") {
    const look = destination(PAD, 48_000, AZIMUTH_DEG);
    return { center: [look.lng, look.lat], zoom: 7.45, pitch: 54, bearing: AZIMUTH_DEG };
  }
  const vehicle = chaseTarget === "booster" ? flight.booster : flight.ship;
  const lead =
    chaseTarget === "ship"
      ? shipRenderLeadM(modelScale) * Math.cos((vehicle.pitchDeg * Math.PI) / 180)
      : 0;
  const look = lead > 1 ? destination(vehicle, lead, AZIMUTH_DEG) : vehicle;
  return {
    center: [look.lng, look.lat],
    zoom: chaseZoom(vehicle),
    pitch: 62,
    bearing: AZIMUTH_DEG,
  };
}

function chaseZoom(vehicle: VehicleState): number {
  const altitudeTerm = Math.log2(1 + vehicle.altitudeM / 2800);
  const scaleTerm = Math.log2(modelScale) * 0.32;
  return clamp(16.5 - altitudeTerm + scaleTerm, 8.8, 17.3);
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

function wrapDegrees(delta: number): number {
  return ((delta + 540) % 360) - 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
