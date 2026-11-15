import test from "node:test";
import assert from "node:assert/strict";
import { geographicSnapshot, snapshotViewport } from "../src/lib/geo/snapshot";
import type { Detection } from "../src/lib/llamita/data";
const point = (lon: number, lat: number) =>
  ({ longitude: lon, latitude: lat, frp: 20 }) as Detection;
test("report maps contain real geographic outlines and only selected-area points", () => {
  const svg = geographicSnapshot(
    [point(-66, -17), point(130, 35)],
    [-70, -23, -57, -9],
  );
  assert.ok(svg.includes("<path"));
  assert.ok(svg.includes("Bolivia"));
  assert.equal((svg.match(/<circle /g) || []).length, 1);
  assert.equal(svg.includes("NaN"), false);
  assert.equal(svg.includes("Infinity"), false);
});
test("world and regional map viewports preserve scale and handle poles", () => {
  for (const bbox of [
    [-180, -90, 180, 90],
    [-70, -23, -57, -9],
  ] as [number, number, number, number][]) {
    const v = snapshotViewport(bbox, 900, 380);
    assert.ok(Math.abs(v.spanX / v.spanY - 900 / 380) < 1e-10);
    assert.ok(v.project(bbox[0], bbox[1]).every(Number.isFinite));
    assert.ok(v.project(bbox[2], bbox[3]).every(Number.isFinite));
  }
});
