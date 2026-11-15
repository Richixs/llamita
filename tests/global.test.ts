import test from "node:test";
import assert from "node:assert/strict";
import { locateCountry, inCountry } from "../src/lib/geo/countries";
import { historyChunks } from "../src/lib/firms/history";
import { parseHotspotQuery, queryHotspots } from "../src/lib/firms/query";
import { WORLD_BBOX } from "../src/lib/geo/catalog";
import { byDay } from "../src/lib/llamita/data";

test("countries resolve across continents, including small island states", () => {
  for (const [lat, lon, code] of [
    [-17.39, -66.17, "BOL"],
    [40, -100, "USA"],
    [-15.79, -47.88, "BRA"],
    [35.68, 139.69, "JPN"],
    [-1.29, 36.82, "KEN"],
    [-33.87, 151.21, "AUS"],
    [1.35, 103.82, "SGP"],
  ] as const)
    assert.equal(locateCountry(lat, lon)?.code, code);
  assert.equal(locateCountry(0, -140), undefined);
  assert.equal(inCountry("BOL", -15.79, -47.88), false);
});
test("world queries accept the FIRMS world extent and bounded batches", () => {
  const q = parseHotspotQuery(
    new URLSearchParams({
      from: "2026-01-01",
      to: "2026-01-05",
      bbox: "world",
    }),
  );
  assert.deepEqual(q.bbox, WORLD_BBOX);
  assert.throws(
    () =>
      parseHotspotQuery(
        new URLSearchParams({
          from: "2026-01-01",
          to: "2026-01-06",
          bbox: "world",
        }),
      ),
    /bloques/,
  );
  assert.throws(
    () =>
      parseHotspotQuery(
        new URLSearchParams({
          from: "1999-01-01",
          to: "1999-01-02",
          bbox: "world",
        }),
      ),
    /2000/,
  );
});
test("multi-year history from 2000 through 2026 is partitioned without missing leap days", () => {
  const chunks = historyChunks("2000-01-01", "2026-12-31", WORLD_BBOX);
  assert.equal(chunks[0].from, "2000-01-01");
  assert.equal(chunks.at(-1)!.to, "2026-12-31");
  let days = 0;
  chunks.forEach((c, i) => {
    const count = (Date.parse(c.to) - Date.parse(c.from)) / 86400000 + 1;
    assert.ok(count <= 5);
    days += count;
    if (i)
      assert.equal(Date.parse(c.from) - Date.parse(chunks[i - 1].to), 86400000);
  });
  assert.equal(days, 9862);
  assert.equal(byDay([], "2000-01-01", "2026-12-31").length, 9862);
});
test("global results preserve overseas detections and country filtering uses actual polygons", async (t) => {
  const original = globalThis.fetch,
    key = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "test-global-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = key;
  });
  globalThis.fetch = async (input) =>
    String(input).includes("data_availability")
      ? new Response(
          "data_id,min_date,max_date\nMODIS_NRT,2026-01-01,2026-01-10\n",
        )
      : new Response(
          "latitude,longitude,acq_date,acq_time,frp,satellite\n-15.79,-47.88,2026-01-02,1200,9,T\n-17.39,-66.17,2026-01-02,1200,4,T\n",
        );
  const base = {
    from: "2026-01-02",
    to: "2026-01-02",
    sensor: "MODIS" as const,
    bbox: WORLD_BBOX,
  };
  assert.equal((await queryHotspots(base)).data.length, 2);
  const bolivia = await queryHotspots({ ...base, country: "BOL" });
  assert.equal(bolivia.data.length, 1);
  assert.equal(bolivia.data[0].countryCode, "BOL");
});
