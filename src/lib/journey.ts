// Journey map geometry. Pure functions shared by the build (static Home preview)
// and the browser (interactive About map). Coordinate space: 1280×520.
// The projection matches the one the basemap image was rendered with — don't tweak it.

export type Pt = [number, number];
export type Stop = { lon: number; lat: number };
export type Camera = { s: number; tx: number; ty: number };

export const W = 1280;
export const H = 520;
export const VIS = 456; // visible map height above the 64px HUD

const LAT0 = 72;
const LON0 = -104;
const S = VIS / 92;
const K = 1.0;
const XS = 1.3;
const YH = 62;
const HG = 410;
const CX = 640;
const CURV = 46;
const W0 = 1 / (1 + K);

export function flat(lon: number, lat: number): Pt {
  return [(lon - LON0) * S, (LAT0 - lat) * S];
}

export function proj([fx, fy]: Pt): Pt {
  fy = Math.max(2, fy);
  const v = fy / VIS;
  const w = 1 / (1 + (1 - v) * K);
  const t = (w - W0) / (1 - W0);
  const sx = CX + (fx - CX) * w * XS;
  const sy = YH + t * HG + CURV * ((sx - CX) / CX) ** 2 * (1 - t);
  return [sx, sy];
}

export const project = (s: Stop): Pt => proj(flat(s.lon, s.lat));

const LEG_K = [0.2, -0.15, 0.15, 0.12]; // legs 2–5

/** Quadratic Bézier in flat space for leg i (0-based, from stop i to i+1), sampled and projected. */
export function legSamples(stops: Stop[], i: number, steps = 60): Pt[] {
  const [ax, ay] = flat(stops[i].lon, stops[i].lat);
  const [bx, by] = flat(stops[i + 1].lon, stops[i + 1].lat);
  let c: Pt;
  if (i === 0) c = [(ax + bx) / 2, Math.min(ay, by) - 300];
  else if (i === 5) c = [(ax + bx) / 2, Math.min(ay, by) - 260];
  else {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let nx = -dy / len;
    let ny = dx / len;
    if (ny > 0) [nx, ny] = [-nx, -ny]; // point the normal up
    const k = LEG_K[i - 1];
    c = [(ax + bx) / 2 + nx * len * k, (ay + by) / 2 + ny * len * k];
  }
  const out: Pt[] = [];
  for (let n = 0; n <= steps; n++) {
    const t = n / steps;
    const u = 1 - t;
    out.push(proj([u * u * ax + 2 * u * t * c[0] + t * t * bx, u * u * ay + 2 * u * t * c[1] + t * t * by]));
  }
  return out;
}

export const pathD = (pts: Pt[]) =>
  pts.map(([x, y], n) => `${n ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Camera for step k (1-based). `visH` is the visible height: 456 when the HUD
 * overlays the map, 520 when the HUD sits below it (mobile).
 */
export function cameraFor(k: number, stops: Stop[], legs: Pt[][], visH = VIS): Camera {
  let s: number;
  let cx: number;
  let cy: number;
  if (k === 1) {
    s = 2.4;
    [cx, cy] = project(stops[0]);
  } else {
    const pts = legs[k - 2];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    s = clamp(Math.min(W / (x1 - x0 + 220), VIS / (y1 - y0 + 170)), 1, 2.4);
    cx = (x0 + x1) / 2;
    cy = (y0 + y1) / 2 + 12;
  }
  const tx = clamp(W / 2 - s * cx, W - W * s, 0);
  const ty = clamp(visH / 2 - s * cy, visH - H * s, 0);
  return { s, tx, ty };
}

export const toScreen = ([x, y]: Pt, c: Camera): Pt => [c.s * x + c.tx, c.s * y + c.ty];

/** Heading in degrees (0 = nose up) of the segment a→b in screen space. */
export const heading = (a: Pt, b: Pt) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 90;

/** Shortest signed rotation from a to b, in degrees. */
export const shortestDelta = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

export const formatKm = (km: number) => `${km.toLocaleString('en-CA')} KM`;
