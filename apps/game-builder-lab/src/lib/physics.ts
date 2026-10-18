import type { Rect } from "./level";

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export const GRAVITY = 1800;
export const MOVE_SPEED = 170;
export const JUMP_SPEED = 540;
export const MAX_FALL = 900;
export const STEP_UP = 20;

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function centerIn(body: Rect, zone: Rect): boolean {
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;
  return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h;
}

/** Moves one axis at a time so a body slides along walls and lands on floors. */
export function moveAndCollide(body: Body, solids: readonly Rect[], dt: number): Body {
  let { x, y, vx, vy } = body;
  let onGround = false;

  x += vx * dt;
  for (const s of solids) {
    if (!overlaps({ x, y, w: body.w, h: body.h }, s)) continue;
    const rise = y + body.h - s.y;
    const clear = !solids.some((o) => overlaps({ x, y: y - rise, w: body.w, h: body.h }, o));
    if (body.onGround && rise <= STEP_UP && clear) {
      y -= rise;
      continue;
    }
    x = vx > 0 ? s.x - body.w : s.x + s.w;
    vx = 0;
  }

  y += vy * dt;
  for (const s of solids) {
    if (!overlaps({ x, y, w: body.w, h: body.h }, s)) continue;
    if (vy > 0) {
      y = s.y - body.h;
      onGround = true;
    } else {
      y = s.y + s.h;
    }
    vy = 0;
  }

  return { ...body, x, y, vx, vy, onGround };
}
