import test from "node:test";
import assert from "node:assert/strict";
import { toDetection } from "../src/lib/firms/query";
import type { FirmsHotspot } from "../src/lib/firms/types";
import { filterDetections, ranking } from "../src/lib/llamita/data";
import { initialFilters } from "../src/lib/llamita/filters";
import { liveConfig, reportData } from "../src/lib/llamita/report";
import { REGIONAL_BBOX } from "../src/lib/geo/catalog";
import { exportReport } from "../src/lib/llamita/export-report";
const data = [
  [-17.39, -66.17],
  [-17.45, -63.67],
  [-15.83, -67.57],
].map(([latitude, longitude]) =>
  toDetection(
    {
      latitude,
      longitude,
      acq_date: "2026-11-15",
      acq_time: "1200",
      frp: 10,
      satellite: "N20",
    } as FirmsHotspot,
    "VIIRS_NOAA20_NRT",
  ),
);
const filters = {
  ...initialFilters,
  local: true,
  country: "BOL",
  continent: "América del Sur",
  from: "2026-11-15",
  to: "2026-11-15",
};
test("Cochabamba statistics exclude other departments inside the regional rectangle", () => {
  for (const d of data) {
    assert.equal(d.countryCode, "BOL");
    assert.ok(
      d.longitude >= REGIONAL_BBOX[0] &&
        d.longitude <= REGIONAL_BBOX[2] &&
        d.latitude >= REGIONAL_BBOX[1] &&
        d.latitude <= REGIONAL_BBOX[3],
    );
  }
  const selected = filterDetections(filters, data);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].municipality, "Cochabamba");
  assert.deepEqual(ranking(selected, "municipality"), [
    { name: "Cochabamba", count: 1 },
  ]);
  assert.equal(filterDetections({ ...filters, local: false }, data).length, 3);
});
test("Cochabamba report previews and downloads use the same data as statistics", async () => {
  const config = liveConfig(filters, REGIONAL_BBOX);
  assert.deepEqual(reportData(config, data), filterDetections(filters, data));
  const blob = await exportReport({ ...config, format: "GeoJSON" }, data);
  const json = JSON.parse(await blob.text());
  assert.equal(json.features.length, 1);
  assert.equal(json.features[0].properties.municipio, "Cochabamba");
});
