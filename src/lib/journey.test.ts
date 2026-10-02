import { test } from 'node:test';
import assert from 'node:assert/strict';
import cities from '../content/cities.json' with { type: 'json' };
import { cameraFor, legSamples, project, toScreen, shortestDelta, H, W, VIS } from './journey.ts';

const legs = cities.slice(0, -1).map((_, i) => legSamples(cities, i));
const near = (a: number, b: number, tol = 1.5) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b}`);

test('step 7 camera and pins match the Figma Journey Map (node 42:784)', () => {
  const cam = cameraFor(7, cities, legs);
  near(cam.s, 1.1446, 0.002);
  near(cam.tx, -90.39);
  near(cam.ty, -14.69);
  // Pin centres in Figma: Seoul (1104.26, 180.43), Moscow (692.72, 101.93), Toronto (186.6, 158.41)
  const [sx, sy] = toScreen(project(cities[0]), cam);
  near(sx, 1104.26); near(sy, 180.43);
  const [mx, my] = toScreen(project(cities[4]), cam);
  near(mx, 692.72); near(my, 101.93);
  const [tx, ty] = toScreen(project(cities[6]), cam);
  near(tx, 186.6); near(ty, 158.41);
});

test('camera never shows outside the image', () => {
  for (const visH of [VIS, H]) {
    for (let k = 1; k <= 7; k++) {
      const c = cameraFor(k, cities, legs, visH);
      assert.ok(c.s >= 1 && c.s <= 2.4);
      assert.ok(c.tx <= 0 && c.tx + W * c.s >= W - 1e-9, `x edge at step ${k}`);
      assert.ok(c.ty <= 0 && c.ty + H * c.s >= visH - 1e-9, `y edge at step ${k}`);
    }
  }
});

test('every leg ends on its city', () => {
  legs.forEach((pts, i) => {
    const [ax, ay] = project(cities[i]);
    const [bx, by] = project(cities[i + 1]);
    near(pts[0][0], ax, 1e-6); near(pts[0][1], ay, 1e-6);
    near(pts.at(-1)![0], bx, 1e-6); near(pts.at(-1)![1], by, 1e-6);
  });
});

test('shortest rotation', () => {
  assert.equal(shortestDelta(350, 10), 20);
  assert.equal(shortestDelta(10, 350), -20);
  assert.equal(shortestDelta(-170, 170), -20);
});
