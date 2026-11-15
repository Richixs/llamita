import test from "node:test";
import assert from "node:assert/strict";
import { gridCell, harmonizeToGrid } from "../src/lib/firms/grid";
import type { Detection } from "../src/lib/llamita/data";

// A point solidly in the middle of a grid cell (not near a boundary), plus
// small/large offsets verified against gridCell() itself in a scratch run
// before being hardcoded here.
const BASE_LAT = -17.40321;
const BASE_LON = -66.15234;

function det(overrides: Partial<Detection> & Pick<Detection, "id" | "latitude" | "longitude">): Detection {
  return {
    origin: "live",
    source: "VIIRS_NOAA20_NRT",
    municipality: "Sin asignar",
    province: "Sin asignar",
    date: "2026-11-14",
    time: "14:00",
    frp: 5,
    satellite: "VIIRS",
    protectedArea: "",
    territory: "",
    x: overrides.longitude,
    y: overrides.latitude,
    ...overrides,
  };
}

test("a VIIRS and a MODIS pixel over the same fire merge into one record", () => {
  const viirs = det({
    id: "v1",
    latitude: BASE_LAT,
    longitude: BASE_LON,
    frp: 11.23,
    satellite: "VIIRS",
    source: "VIIRS_NOAA20_NRT",
  });
  const modis = det({
    id: "m1",
    latitude: BASE_LAT + 0.0003,
    longitude: BASE_LON + 0.0003,
    frp: 21.03,
    satellite: "MODIS",
    source: "MODIS_NRT",
  });
  const result = harmonizeToGrid([viirs, modis]);
  assert.equal(result.length, 1);
  // VIIRS is finer resolution, so its coordinates represent the merged point.
  assert.equal(result[0].latitude, viirs.latitude);
  assert.equal(result[0].longitude, viirs.longitude);
  // The group's strongest reading is kept, not a sum of both.
  assert.equal(result[0].frp, 21.03);
  assert.equal(result[0].observationCount, 2);
  assert.deepEqual(
    [...result[0].detectedBy!].sort(),
    ["MODIS_NRT", "VIIRS_NOAA20_NRT"],
  );
});

test("pixels more than ~1km apart stay as separate fires", () => {
  const a = det({ id: "a", latitude: BASE_LAT, longitude: BASE_LON });
  const b = det({ id: "b", latitude: BASE_LAT - 0.02, longitude: BASE_LON - 0.02 }); // ~2.7km away
  const result = harmonizeToGrid([a, b]);
  assert.equal(result.length, 2);
});

test("the same grid cell on different days is not merged", () => {
  const a = det({ id: "a", latitude: BASE_LAT, longitude: BASE_LON, date: "2026-11-14" });
  const b = det({
    id: "b",
    latitude: BASE_LAT + 0.0002,
    longitude: BASE_LON + 0.0002,
    date: "2026-11-15",
  });
  const result = harmonizeToGrid([a, b]);
  assert.equal(result.length, 2);
});

test("adjacent VIIRS sub-pixels within one grid cell collapse too", () => {
  const points = [
    det({ id: "v1", latitude: BASE_LAT, longitude: BASE_LON, frp: 3 }),
    det({ id: "v2", latitude: BASE_LAT + 0.0003, longitude: BASE_LON + 0.0003, frp: 9 }),
    det({ id: "v3", latitude: BASE_LAT + 0.0001, longitude: BASE_LON + 0.0002, frp: 4 }),
  ];
  const result = harmonizeToGrid(points);
  assert.equal(result.length, 1);
  assert.equal(result[0].frp, 9);
  assert.equal(result[0].observationCount, 3);
});

test("gridCell is stable for nearby points and differs for distant ones", () => {
  assert.equal(gridCell(BASE_LAT, BASE_LON), gridCell(BASE_LAT + 0.0003, BASE_LON + 0.0003));
  assert.notEqual(gridCell(BASE_LAT, BASE_LON), gridCell(BASE_LAT + 0.015, BASE_LON + 0.015));
});
