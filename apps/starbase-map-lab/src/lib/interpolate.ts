/**
 * Fritsch–Carlson monotone cubic Hermite interpolation.
 * Knots are returned exactly. Increasing inputs stay non-decreasing between knots.
 */
export function pchip(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  if (n !== ys.length || n === 0) {
    throw new Error("pchip: xs and ys must be the same non-empty length");
  }
  const x0 = xs[0];
  const y0 = ys[0];
  if (x0 === undefined || y0 === undefined) {
    throw new Error("pchip: missing first knot");
  }
  if (n === 1 || x <= x0) return y0;
  const xLast = xs[n - 1];
  const yLast = ys[n - 1];
  if (xLast === undefined || yLast === undefined) {
    throw new Error("pchip: missing last knot");
  }
  if (x >= xLast) return yLast;

  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const left = xs[i];
    const right = xs[i + 1];
    const yLeft = ys[i];
    const yRight = ys[i + 1];
    if (left === undefined || right === undefined || yLeft === undefined || yRight === undefined) {
      throw new Error("pchip: missing knot");
    }
    const span = right - left;
    if (span <= 0) throw new Error("pchip: xs must be strictly increasing");
    h.push(span);
    delta.push((yRight - yLeft) / span);
  }

  const m = endpointSlopes(h, delta);
  let i = 0;
  while (i < n - 2) {
    const next = xs[i + 1];
    if (next === undefined || x < next) break;
    i += 1;
  }
  const span = h[i];
  const xk = xs[i];
  const yk = ys[i];
  const yk1 = ys[i + 1];
  const mk = m[i];
  const mk1 = m[i + 1];
  if (
    span === undefined ||
    xk === undefined ||
    yk === undefined ||
    yk1 === undefined ||
    mk === undefined ||
    mk1 === undefined
  ) {
    throw new Error("pchip: interval lookup failed");
  }
  const t = (x - xk) / span;
  return hermite(yk, yk1, mk * span, mk1 * span, t);
}

function endpointSlopes(h: readonly number[], delta: readonly number[]): number[] {
  const n = delta.length + 1;
  const m = new Array<number>(n).fill(0);
  if (delta.length === 1) {
    const d0 = delta[0] ?? 0;
    m[0] = d0;
    m[1] = d0;
    return m;
  }

  for (let k = 1; k < n - 1; k += 1) {
    const d0 = delta[k - 1] ?? 0;
    const d1 = delta[k] ?? 0;
    if (d0 === 0 || d1 === 0 || d0 * d1 < 0) {
      m[k] = 0;
      continue;
    }
    const h0 = h[k - 1] ?? 0;
    const h1 = h[k] ?? 0;
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[k] = (w1 + w2) / (w1 / d0 + w2 / d1);
  }

  m[0] = endSlope(h[0] ?? 0, h[1] ?? 0, delta[0] ?? 0, delta[1] ?? 0);
  m[n - 1] = endSlope(
    h[n - 2] ?? 0,
    h[n - 3] ?? 0,
    delta[n - 2] ?? 0,
    delta[n - 3] ?? 0,
  );
  return m;
}

function endSlope(h0: number, h1: number, d0: number, d1: number): number {
  const denom = h0 + h1;
  let slope = denom === 0 ? d0 : ((2 * h0 + h1) * d0 - h0 * d1) / denom;
  if (slope * d0 <= 0) return 0;
  if (d0 * d1 < 0 && Math.abs(slope) > Math.abs(3 * d0)) return 3 * d0;
  return slope;
}

function hermite(y0: number, y1: number, m0: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * y0 + h10 * m0 + h01 * y1 + h11 * m1;
}
