import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map as MapLibreMap,
} from "maplibre-gl";
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Camera,
  DirectionalLight,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  ARM_PIVOT_M,
  AZIMUTH_DEG,
  BOOSTER_HEIGHT_M,
  CATCH_ALTITUDE_M,
  COUNTDOWN_S,
  LOOP_LENGTH_S,
  PAD,
  TOWER_OFFSET_M,
} from "../config/profile";
import { stateAt } from "../lib/profile";
import type { FlightState, VehicleState } from "../lib/types";
import { buildRig, plumeMaterials, type Rig } from "./models";

export type Frame = {
  state: FlightState;
  modelScale: number;
};

const LAYER_ID = "starbase-vehicles";
const UP = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);

export function createVehicleLayer(getFrame: () => Frame): CustomLayerInterface {
  const camera = new Camera();
  const scene = new Scene();
  const rig = buildRig();
  const trails = buildTrails();
  let map: MapLibreMap | null = null;
  let renderer: WebGLRenderer | null = null;
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let bufferWidth = 0;
  let bufferHeight = 0;

  const mapMatrix = new Matrix4();
  const modelMatrix = new Matrix4();
  const rotationX = new Matrix4().makeRotationAxis(X_AXIS, Math.PI / 2);
  const direction = new Vector3();
  const origin = MercatorCoordinate.fromLngLat([PAD.lng, PAD.lat], 0);
  const meterScale = origin.meterInMercatorCoordinateUnits();

  scene.add(new AmbientLight(0xd5e4ef, 0.72));
  const sun = new DirectionalLight(0xfff1dd, 1.15);
  sun.position.set(80, 120, 40);
  scene.add(sun);
  const fill = new DirectionalLight(0x9eb4c4, 0.45);
  fill.position.set(-60, 40, -80);
  scene.add(fill);

  scene.add(rig.pad, rig.tower, rig.booster, rig.ship);
  scene.add(trails.shipFull, trails.shipFlown, trails.boosterFull, trails.boosterFlown);

  const layer: CustomLayerInterface = {
    id: LAYER_ID,
    type: "custom",
    renderingMode: "3d",
    onAdd(nextMap, context) {
      map = nextMap;
      if (gl === context && renderer) return;
      gl = context;
      renderer = new WebGLRenderer({
        canvas: nextMap.getCanvas(),
        context,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_context, args) {
      if (!renderer) return;
      const frame = getFrame();
      placeComplex(rig, frame.modelScale);
      placeVehicle(rig.booster, frame.state.booster, frame.modelScale, 0, direction);
      placeVehicle(rig.ship, frame.state.ship, frame.modelScale, shipRenderLeadM(frame.modelScale), direction);
      rig.boosterPlume.visible = frame.state.booster.enginesOn;
      rig.shipPlume.visible = frame.state.ship.enginesOn;
      rig.flash.visible = frame.state.hotStageFlash;
      const swing = (frame.state.armDeg * Math.PI) / 180;
      rig.northArm.rotation.y = swing;
      rig.southArm.rotation.y = -swing;
      const flicker = 0.7 + Math.sin(frame.state.t * 28) * 0.22;
      setPlumeOpacity(rig.boosterPlume, flicker);
      setPlumeOpacity(rig.shipPlume, Math.min(1, flicker * 0.9));
      setFlown(trails.shipFlown, trails.shipTimes, frame.state.t);
      setFlown(trails.boosterFlown, trails.boosterTimes, frame.state.t);

      const canvas = map?.getCanvas();
      if (canvas && (canvas.width !== bufferWidth || canvas.height !== bufferHeight)) {
        bufferWidth = canvas.width;
        bufferHeight = canvas.height;
        renderer.setSize(bufferWidth, bufferHeight, false);
      }

      // Same mercator model matrix as MapLibre's three.js custom-layer example:
      // translate to the pad, scale metres into mercator, rotate Y-up onto Z-up.
      modelMatrix.makeTranslation(origin.x, origin.y, origin.z);
      modelMatrix.scale(new Vector3(meterScale, -meterScale, meterScale));
      modelMatrix.multiply(rotationX);
      mapMatrix.fromArray(args.defaultProjectionData.mainMatrix);
      camera.projectionMatrix = mapMatrix.multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
      map?.triggerRepaint();
    },
  };

  return layer;
}

/** Along-nose shift that keeps a scaled ship sitting on the scaled booster. */
export function shipRenderLeadM(modelScale: number): number {
  return (modelScale - 1) * BOOSTER_HEIGHT_M;
}

function placeComplex(rig: Rig, modelScale: number): void {
  const catchPinY = CATCH_ALTITUDE_M + (ARM_PIVOT_M - CATCH_ALTITUDE_M) * modelScale;
  const towerScaleY = catchPinY / ARM_PIVOT_M;
  rig.pad.position.set(0, 0, 0);
  rig.pad.scale.setScalar(modelScale);
  rig.tower.position.set(TOWER_OFFSET_M.eastM * modelScale, 0, -TOWER_OFFSET_M.northM * modelScale);
  rig.tower.scale.set(modelScale, towerScaleY, modelScale);
}

function placeVehicle(
  group: Group,
  vehicle: VehicleState,
  modelScale: number,
  leadM: number,
  direction: Vector3,
): void {
  const position = sceneMeters(vehicle.lng, vehicle.lat, vehicle.altitudeM);
  const pitch = (vehicle.pitchDeg * Math.PI) / 180;
  const azimuth = (AZIMUTH_DEG * Math.PI) / 180;
  direction.set(
    Math.cos(pitch) * Math.sin(azimuth),
    Math.sin(pitch),
    -Math.cos(pitch) * Math.cos(azimuth),
  );
  if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
  direction.normalize();
  if (leadM !== 0) position.addScaledVector(direction, leadM);
  group.position.copy(position);
  group.scale.setScalar(modelScale);
  group.quaternion.setFromUnitVectors(UP, direction);
}

function sceneMeters(lng: number, lat: number, altitudeM: number): Vector3 {
  const origin = MercatorCoordinate.fromLngLat([PAD.lng, PAD.lat], 0);
  const point = MercatorCoordinate.fromLngLat([lng, lat], altitudeM);
  const meters = origin.meterInMercatorCoordinateUnits();
  return new Vector3(
    (point.x - origin.x) / meters,
    ((point.z ?? 0) - (origin.z ?? 0)) / meters,
    (point.y - origin.y) / meters,
  );
}

function setPlumeOpacity(group: Group, opacity: number): void {
  for (const material of plumeMaterials(group)) {
    material.opacity = opacity;
    material.transparent = true;
  }
}

type TrailSet = {
  shipFull: Line;
  shipFlown: Line;
  shipTimes: number[];
  boosterFull: Line;
  boosterFlown: Line;
  boosterTimes: number[];
};

function buildTrails(): TrailSet {
  const ship = sampleTrail("ship");
  const booster = sampleTrail("booster");
  return {
    shipFull: ship.full,
    shipFlown: ship.flown,
    shipTimes: ship.times,
    boosterFull: booster.full,
    boosterFlown: booster.flown,
    boosterTimes: booster.times,
  };
}

function sampleTrail(which: "ship" | "booster"): { full: Line; flown: Line; times: number[] } {
  const times: number[] = [];
  const coords: number[] = [];
  for (let t = COUNTDOWN_S; t <= LOOP_LENGTH_S; t += 4) {
    const state = stateAt(t);
    const vehicle = state[which];
    const position = sceneMeters(vehicle.lng, vehicle.lat, vehicle.altitudeM);
    times.push(t);
    coords.push(position.x, position.y, position.z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(coords), 3));
  const color = which === "ship" ? 0x9fd7e2 : 0xe7a15a;
  const full = new Line(
    geometry.clone(),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.28 }),
  );
  const flown = new Line(
    geometry,
    new LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  full.frustumCulled = false;
  flown.frustumCulled = false;
  return { full, flown, times };
}

function setFlown(line: Line, times: number[], t: number): void {
  let count = 0;
  for (const time of times) {
    if (time > t) break;
    count += 1;
  }
  line.geometry.setDrawRange(0, Math.max(count, 0));
}
