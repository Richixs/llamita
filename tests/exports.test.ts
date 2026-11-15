import test from "node:test";
import assert from "node:assert/strict";
import { csvText, geojson } from "../src/lib/llamita/downloads";
import { toDetection } from "../src/lib/firms/query";
import type { FirmsHotspot } from "../src/lib/firms/types";
const live = toDetection(
  {
    latitude: -17.39,
    longitude: -66.17,
    acq_date: "2026-11-15",
    acq_time: "1230",
    frp: 31.6,
    satellite: "N20",
  } as FirmsHotspot,
  "VIIRS_NOAA20_NRT",
);
test("real exports preserve coordinates and identify NASA without demo attribution", () => {
  const csv = csvText([live]);
  assert.ok(csv.includes('"NASA FIRMS"'));
  assert.equal(csv.includes("DATOS DE EJEMPLO"), false);
  const feature = geojson([live]).features[0];
  assert.deepEqual(feature.geometry.coordinates, [-66.17, -17.39]);
  assert.equal("ejemplo" in feature.properties, false);
  assert.equal(feature.properties.producto, "VIIRS_NOAA20_NRT");
});
test("legacy example records cannot be exported", () => {
  const demo = { ...live, origin: undefined, source: undefined };
  assert.throws(() => csvText([demo]), /detecciones reales/);
  assert.throws(() => geojson([demo]), /detecciones reales/);
});
