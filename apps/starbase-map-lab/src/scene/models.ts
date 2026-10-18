import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  TorusGeometry,
  type Material,
} from "three";
import { ARM_PIVOT_M, BOOSTER_HEIGHT_M, SHIP_HEIGHT_M, TOWER_HEIGHT_M } from "../config/profile";

export type Rig = {
  pad: Group;
  tower: Group;
  northArm: Group;
  southArm: Group;
  booster: Group;
  ship: Group;
  boosterPlume: Group;
  shipPlume: Group;
  flash: Mesh;
};

const steel = new MeshStandardMaterial({ color: 0xc5c9ce, metalness: 0.62, roughness: 0.36 });
const shipSteel = new MeshStandardMaterial({ color: 0xb7bcc4, metalness: 0.58, roughness: 0.4 });
const belly = new MeshStandardMaterial({ color: 0x2c3138, metalness: 0.4, roughness: 0.55 });
const towerSteel = new MeshStandardMaterial({ color: 0xe6e1d8, metalness: 0.48, roughness: 0.42 });
const armSteel = new MeshStandardMaterial({ color: 0xb7b1a6, metalness: 0.55, roughness: 0.4 });
const concrete = new MeshStandardMaterial({ color: 0x8a8178, metalness: 0.05, roughness: 0.88 });
const dark = new MeshStandardMaterial({ color: 0x1e2228, metalness: 0.3, roughness: 0.6 });
const plumeMat = new MeshStandardMaterial({
  color: 0xff7a2a,
  emissive: new Color(0xff5a12),
  emissiveIntensity: 1.4,
  roughness: 0.45,
  transparent: true,
  opacity: 0.85,
});
const flashMat = new MeshStandardMaterial({
  color: 0xfff6d8,
  emissive: new Color(0xffc36a),
  emissiveIntensity: 2.4,
  transparent: true,
  opacity: 0.92,
});

export function buildRig(): Rig {
  const pad = buildPad();
  const towerParts = buildTower();
  const booster = buildBooster();
  const ship = buildShip();
  const boosterPlume = buildPlume(0xff7a2a);
  const shipPlume = buildPlume(0xffd2a8);
  const flash = new Mesh(new CylinderGeometry(5.2, 5.2, 3.2, 10), flashMat);
  flash.position.y = BOOSTER_HEIGHT_M;
  booster.add(boosterPlume);
  ship.add(shipPlume);
  booster.add(flash);
  const rootObjects = [pad, towerParts.tower, booster, ship, boosterPlume, shipPlume, flash];
  for (const object of rootObjects) {
    object.traverse((child) => {
      child.frustumCulled = false;
    });
  }
  return {
    pad,
    tower: towerParts.tower,
    northArm: towerParts.northArm,
    southArm: towerParts.southArm,
    booster,
    ship,
    boosterPlume,
    shipPlume,
    flash,
  };
}

function buildPad(): Group {
  const pad = new Group();
  const ring = new Mesh(new TorusGeometry(8.6, 1.15, 6, 14), concrete);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.2;
  pad.add(ring);
  const deck = new Mesh(new CylinderGeometry(6.2, 6.6, 0.8, 10), concrete);
  deck.position.y = 0.4;
  pad.add(deck);
  for (let i = 0; i < 6; i += 1) {
    const leg = new Mesh(new BoxGeometry(1.1, 3.2, 1.1), dark);
    const angle = (i / 6) * Math.PI * 2;
    leg.position.set(Math.cos(angle) * 7.2, 1.6, Math.sin(angle) * 7.2);
    pad.add(leg);
  }
  const diverter = new Mesh(new BoxGeometry(10, 1.4, 16), concrete);
  diverter.position.set(16, 0.7, 0);
  pad.add(diverter);
  return pad;
}

function buildTower(): { tower: Group; northArm: Group; southArm: Group } {
  const tower = new Group();
  const half = 8;
  const corners: ReadonlyArray<readonly [number, number]> = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  for (const [x, z] of corners) {
    const column = new Mesh(new CylinderGeometry(0.55, 0.75, TOWER_HEIGHT_M, 6), towerSteel);
    column.position.set(x, TOWER_HEIGHT_M / 2, z);
    tower.add(column);
  }
  for (let y = 14; y < TOWER_HEIGHT_M; y += 18) {
    tower.add(beam(half * 2, 0.45, 0.45, 0, y, -half));
    tower.add(beam(half * 2, 0.45, 0.45, 0, y, half));
    const east = beam(0.45, 0.45, half * 2, half, y, 0);
    const west = beam(0.45, 0.45, half * 2, -half, y, 0);
    tower.add(east, west);
  }
  const crown = new Mesh(new BoxGeometry(half * 2 + 2, 3, half * 2 + 2), towerSteel);
  crown.position.y = TOWER_HEIGHT_M;
  tower.add(crown);

  const northArm = makeArm(-1);
  const southArm = makeArm(1);
  northArm.position.set(half, ARM_PIVOT_M, -7.4);
  southArm.position.set(half, ARM_PIVOT_M, 7.4);
  tower.add(northArm, southArm);
  return { tower, northArm, southArm };
}

function makeArm(side: 1 | -1): Group {
  const arm = new Group();
  const beam = new Mesh(new BoxGeometry(14, 2.4, 2.2), armSteel);
  beam.position.x = 7;
  arm.add(beam);
  const bumper = new Mesh(new BoxGeometry(3.6, 9, 3.4), armSteel);
  bumper.position.set(12.2, -1.5, side * -3.1);
  arm.add(bumper);
  const carriage = new Mesh(new BoxGeometry(2.4, 8, 2.4), towerSteel);
  carriage.position.set(0, -2, 0);
  arm.add(carriage);
  return arm;
}

function beam(width: number, height: number, depth: number, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), towerSteel);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildBooster(): Group {
  const booster = new Group();
  const body = new Mesh(new CylinderGeometry(4.5, 4.5, 63, 10), steel);
  body.position.y = 31.5;
  booster.add(body);
  const skirt = new Mesh(new CylinderGeometry(4.7, 4.9, 6, 10), dark);
  skirt.position.y = 3;
  booster.add(skirt);
  const interstage = new Mesh(new CylinderGeometry(4.55, 4.55, 4, 10), dark);
  interstage.position.y = BOOSTER_HEIGHT_M - 2;
  booster.add(interstage);
  for (let i = 0; i < 4; i += 1) {
    const fin = new Mesh(new BoxGeometry(3.4, 0.35, 1.6), dark);
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    fin.position.set(Math.cos(angle) * 5.6, 60, Math.sin(angle) * 5.6);
    fin.rotation.y = -angle;
    booster.add(fin);
  }
  const center = new Mesh(new ConeGeometry(1.1, 2.4, 6), dark);
  center.position.y = -0.6;
  center.rotation.x = Math.PI;
  booster.add(center);
  for (let i = 0; i < 8; i += 1) {
    const bell = new Mesh(new ConeGeometry(0.55, 1.8, 5), dark);
    const angle = (i / 8) * Math.PI * 2;
    bell.position.set(Math.cos(angle) * 2.4, -0.4, Math.sin(angle) * 2.4);
    bell.rotation.x = Math.PI;
    booster.add(bell);
  }
  for (const z of [-4.7, 4.7]) {
    const pin = new Mesh(new BoxGeometry(1.2, 1.1, 1.4), armSteel);
    pin.position.set(0, 64, z);
    booster.add(pin);
  }
  return booster;
}

function buildShip(): Group {
  const ship = new Group();
  const bodyHeight = 32;
  const body = new Mesh(new CylinderGeometry(4.5, 4.5, bodyHeight, 10), shipSteel);
  body.position.y = bodyHeight / 2;
  ship.add(body);
  const nose = new Mesh(new ConeGeometry(4.5, SHIP_HEIGHT_M - bodyHeight, 10), shipSteel);
  nose.position.y = bodyHeight + (SHIP_HEIGHT_M - bodyHeight) / 2;
  ship.add(nose);
  const tiles = new Mesh(new CylinderGeometry(4.62, 4.62, 18, 10, 1, false, 0, Math.PI), belly);
  tiles.position.y = 16;
  ship.add(tiles);
  const flaps: ReadonlyArray<readonly [number, number, number]> = [
    [5.6, 28, 0],
    [-5.6, 28, 0],
    [5.8, 6, 0],
    [-5.8, 6, 0],
  ];
  for (const [x, y] of flaps) {
    const flap = new Mesh(new BoxGeometry(2.2, 5.5, 0.35), belly);
    flap.position.set(x, y, 0);
    ship.add(flap);
  }
  return ship;
}

function buildPlume(color: number): Group {
  const plume = new Group();
  const cone = new Mesh(new ConeGeometry(3.1, 16, 8), plumeMat.clone());
  cone.rotation.x = Math.PI;
  cone.position.y = -9;
  plume.add(cone);
  const count = 36;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const along = i / count;
    const radius = 0.4 + along * 2.4;
    const angle = i * 2.399;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = -2 - along * 20;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const points = new Points(
    geometry,
    new PointsMaterial({
      color,
      size: 0.9,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  plume.add(points);
  return plume;
}

export function plumeMaterials(plume: Group): Material[] {
  const materials: Material[] = [];
  plume.traverse((child) => {
    if (child instanceof Mesh || child instanceof Points) {
      const material = child.material;
      if (Array.isArray(material)) materials.push(...material);
      else materials.push(material);
    }
  });
  return materials;
}
