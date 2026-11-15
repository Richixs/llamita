import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDayRange,
  parseDateParam,
  parseAreaCoordinates,
  parseSource,
} from "../src/lib/firms/validation";
import {
  dateChunks,
  parseHotspotQuery,
  toDetection,
} from "../src/lib/firms/query";
import {
  getAreaHotspots,
  getCountries,
  getCountryHotspots,
} from "../src/lib/firms/client";
import type { FirmsHotspot } from "../src/lib/firms/types";
test("FIRMS accepts current products, five-day requests and real dates", () => {
  assert.equal(parseDayRange("5"), 5);
  assert.throws(() => parseDayRange("6"));
  assert.throws(() => parseDateParam("2026-02-30"));
  assert.throws(() => parseAreaCoordinates("-67,,-65,-16"));
  assert.equal(parseSource("VIIRS_NOAA21_NRT"), "VIIRS_NOAA21_NRT");
});
test("date ranges are partitioned without gaps or overlaps", () => {
  assert.deepEqual(dateChunks("2026-11-01", "2026-11-14"), [
    { date: "2026-11-01", dayRange: 5 },
    { date: "2026-11-06", dayRange: 5 },
    { date: "2026-11-11", dayRange: 4 },
  ]);
  assert.throws(() =>
    parseHotspotQuery(
      new URLSearchParams({
        from: "2025-01-01",
        to: "2026-12-31",
        bbox: "-67,-18,-66,-17",
      }),
    ),
  );
  // 2020 is a leap year: Jan 1 - Dec 31 is 366 days, and must still fit.
  assert.doesNotThrow(() =>
    parseHotspotQuery(
      new URLSearchParams({
        from: "2020-01-01",
        to: "2020-12-31",
        bbox: "-67,-18,-66,-17",
      }),
    ),
  );
  assert.throws(() =>
    parseHotspotQuery(
      new URLSearchParams({
        from: "2019-12-31",
        to: "2020-12-31",
        bbox: "-67,-18,-66,-17",
      }),
    ),
  );
});
test("UTC observations cross Bolivia midnight correctly", () => {
  const row = {
    latitude: -17,
    longitude: -66,
    acq_date: "2026-11-15",
    acq_time: "0214",
    frp: 14,
    satellite: "N20",
  } as FirmsHotspot;
  const d = toDetection(row, "VIIRS_NOAA20_NRT");
  assert.equal(d.date, "2026-11-14");
  assert.equal(d.time, "22:14");
  assert.equal(d.latitude, -17);
  assert.equal(d.origin, "live");
  assert.equal(d.municipality, "Villa Tunari");
});
test("country catalog is available locally and rejects unknown countries", async () => {
  const countries = await getCountries();
  assert.ok(countries.length > 200);
  assert.ok(countries.some((c) => c.id === "BOL"));
  await assert.rejects(
    getCountryHotspots({
      source: "MODIS_NRT",
      countryCode: "XXX",
      dayRange: 1,
    }),
    /no reconocido/,
  );
});
test("FIRMS errors never reveal upstream credentials and malformed CSV is rejected", async (t) => {
  const original = globalThis.fetch;
  const key = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "private-test-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = key;
  });
  globalThis.fetch = async () =>
    new Response("private-test-key in upstream error", { status: 400 });
  await assert.rejects(
    getAreaHotspots({
      source: "MODIS_NRT",
      coordinates: "-67,-18,-66,-17",
      dayRange: 1,
    }),
    (e) =>
      e instanceof Error &&
      !e.message.includes("private-test-key") &&
      e.message.includes("400"),
  );
  globalThis.fetch = async () =>
    new Response("Invalid MAP_KEY private-test-key");
  await assert.rejects(
    getAreaHotspots({
      source: "MODIS_NRT",
      coordinates: "-67,-18,-66,-17",
      dayRange: 1,
    }),
    /no devolvió datos válidos/,
  );
  globalThis.fetch = async () =>
    new Response(
      "latitude,longitude,acq_date,acq_time,frp\nno,-66,2026-11-15,0214,4",
    );
  await assert.rejects(
    getAreaHotspots({
      source: "MODIS_NRT",
      coordinates: "-67,-18,-66,-17",
      dayRange: 1,
    }),
    /detección inválida/,
  );
  globalThis.fetch = async () =>
    new Response("latitude,longitude,acq_date,acq_time,frp\n");
  assert.deepEqual(
    await getAreaHotspots({
      source: "MODIS_NRT",
      coordinates: "-67,-18,-66,-17",
      dayRange: 1,
    }),
    [],
  );
});
test("area requests preserve comma-separated coordinates expected by FIRMS", async (t) => {
  const original = globalThis.fetch,
    key = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "private-test-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = key;
  });
  globalThis.fetch = async (input) => {
    assert.ok(String(input).includes("/-67,-18,-66,-17/1"));
    return new Response("latitude,longitude,acq_date,acq_time,frp\n");
  };
  assert.deepEqual(
    await getAreaHotspots({
      source: "MODIS_NRT",
      coordinates: "-67,-18,-66,-17",
      dayRange: 1,
    }),
    [],
  );
});
test("combined queries deduplicate observations and filter by Bolivia days and bounding box", async (t) => {
  const { queryHotspots } = await import("../src/lib/firms/query");
  const original = globalThis.fetch,
    key = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "private-test-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = key;
  });
  let requests = 0;
  globalThis.fetch = async (input) => {
    requests++;
    if (String(input).includes("data_availability"))
      return new Response(
        "data_id,min_date,max_date\nMODIS_NRT,2026-11-01,2026-11-20\n",
      );
    return new Response(
      "latitude,longitude,acq_date,acq_time,frp,satellite\n-17.5,-66.5,2026-11-14,0200,4,T\n-17.5,-66.5,2026-11-14,0400,5,T\n-17.5,-66.5,2026-11-14,0400,5,T\n-17.5,-66.5,2026-11-15,0359,6,T\n-17.5,-66.5,2026-11-15,0400,7,T\n-30,-66.5,2026-11-14,0500,8,T\n",
    );
  };
  const query = {
    from: "2026-11-14",
    to: "2026-11-14",
    sensor: "MODIS" as const,
    bbox: [-67, -18, -66, -17] as [number, number, number, number],
  };
  const result = await queryHotspots(query);
  // Both surviving observations sit at the exact same coordinates and
  // Bolivia-local day, so the grid harmonization step merges them into one.
  assert.equal(result.data.length, 1);
  assert.ok(
    result.data.every((d) => d.date === "2026-11-14" && d.origin === "live"),
  );
  assert.equal(result.data[0].time, "23:59");
  assert.equal(result.data[0].observationCount, 2);
  assert.equal(requests, 2);
  await queryHotspots(query);
  assert.equal(requests, 2, "identical queries reuse the bounded server cache");
});
test("historical date ranges fall back to the SP archive product", async (t) => {
  const { queryHotspots } = await import("../src/lib/firms/query");
  const original = globalThis.fetch,
    key = process.env.FIRMS_MAP_KEY;
  process.env.FIRMS_MAP_KEY = "private-test-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.FIRMS_MAP_KEY;
    else process.env.FIRMS_MAP_KEY = key;
  });
  const requestedSources: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("data_availability"))
      return new Response(
        "data_id,min_date,max_date\nMODIS_NRT,2026-09-01,2026-11-20\nMODIS_SP,2000-11-01,2026-08-31\n",
      );
    const match = url.match(/\/api\/area\/csv\/[^/]+\/([^/]+)\//);
    if (match) requestedSources.push(match[1]);
    return new Response(
      "latitude,longitude,acq_date,acq_time,frp,satellite\n-17.5,-66.5,2020-06-01,0300,9,T\n",
    );
  };
  // Fully inside 2020: outside MODIS_NRT's window, inside MODIS_SP's.
  const query = {
    from: "2020-01-01",
    to: "2020-12-31",
    sensor: "MODIS" as const,
    bbox: [-69, -19, -68, -18] as [number, number, number, number],
  };
  const result = await queryHotspots(query);
  assert.ok(requestedSources.length > 0);
  assert.ok(
    requestedSources.every((s) => s === "MODIS_SP"),
    "a fully historical range must only hit the SP product",
  );
  assert.ok(result.data.every((d) => d.source === "MODIS_SP"));
});
