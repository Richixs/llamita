import test from "node:test";
import assert from "node:assert/strict";
import {
  reportPlan,
  reportRankings,
  reportTimeline,
} from "../src/lib/llamita/report-model";
import {
  liveConfig,
  reportData,
  reportPages,
  isReportConfig,
  reportFilename,
} from "../src/lib/llamita/report";
import { exportReport } from "../src/lib/llamita/export-report";
import { initialFilters } from "../src/lib/llamita/filters";
import type { Detection } from "../src/lib/llamita/data";
const filters = {
  ...initialFilters,
  mode: "range" as const,
  from: "2000-01-01",
  to: "2026-11-15",
};
const config = {
  ...liveConfig(filters),
  sections: ["summary", "map", "daily", "ranking", "table"] as const,
};
function detection(
  id: string,
  country: string,
  date = "2026-11-15",
): Detection {
  return {
    id,
    origin: "live",
    country,
    countryCode: country === "Bolivia" ? "BOL" : "BRA",
    source: "MODIS_SP",
    date,
    time: "12:00",
    frp: 10,
    satellite: "MODIS",
    latitude: -17.39,
    longitude: -66.17,
    municipality: "Sin asignar",
    province: "Sin asignar",
    protectedArea: "",
    territory: "",
    x: -66.17,
    y: -17.39,
  };
}
const data = [
  detection("1", "Bolivia"),
  detection("2", "Brasil"),
  detection("3", "Brasil"),
];
test("report plan includes ranks and paginates warnings and full data identically", () => {
  const c = {
    ...config,
    sections: [...config.sections],
    warnings: Array.from({ length: 9 }, (_, i) => `Aviso ${i}`),
  };
  const records = Array.from({ length: 29 }, (_, i) => ({
    ...data[0],
    id: String(i),
    municipality: i === 0 ? "Cochabamba" : "Sin asignar",
  }));
  assert.deepEqual(
    reportPlan(c, records).map((p) => p.kind),
    [
      "overview",
      "ranking",
      "local-ranking",
      "warnings",
      "warnings",
      "table",
      "table",
    ],
  );
  assert.equal(reportPages(c, records), 7);
  assert.deepEqual(reportRankings(data).countries, [
    { name: "Brasil", count: 2 },
    { name: "Bolivia", count: 1 },
  ]);
});
test("historic chart covers all years from 2000, preserving counts", () => {
  const t = reportTimeline(
    [
      detection("a", "Bolivia", "2000-01-01"),
      detection("b", "Bolivia", "2026-11-15"),
    ],
    "2000-01-01",
    "2026-11-15",
  );
  assert.equal(t.title, "Focos por año");
  assert.equal(t.values.length, 27);
  assert.equal(
    t.values.reduce((sum, v) => sum + v.count, 0),
    2,
  );
});
test("reports preserve country and local administrative filters", () => {
  const local = liveConfig({
    ...filters,
    country: "BOL",
    continent: "América del Sur",
    municipality: "Cochabamba",
  });
  assert.equal(local.areaType, "municipality");
  const records = [
    { ...data[0], municipality: "Cochabamba", continent: "América del Sur" },
    ...data,
  ];
  assert.equal(reportData(local, records).length, 1);
  assert.equal(isReportConfig({ ...local, origin: "demo" }), false);
});
test("Excel contains country, sensor and local rankings plus all detections", async () => {
  const blob = await exportReport(
    { ...config, sections: [...config.sections], format: "Excel" },
    data,
  );
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await blob.arrayBuffer());
  assert.deepEqual(workbook.SheetNames, [
    "Detecciones",
    "Países",
    "Sensores",
    "Municipios",
    "Provincias",
    "Por día",
  ]);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Países"]);
  assert.deepEqual(rows, [
    { País: "Brasil", Focos: 2 },
    { País: "Bolivia", Focos: 1 },
  ]);
  assert.equal(XLSX.utils.sheet_to_json(workbook.Sheets.Detecciones).length, 3);
});
test("CSV and GeoJSON downloads use real records and preserve geographic attributes", async () => {
  const c = { ...config, sections: [...config.sections] };
  const csv = await (await exportReport({ ...c, format: "CSV" }, data)).text();
  assert.ok(csv.includes("Brasil"));
  assert.equal(csv.includes("ejemplo"), false);
  const json = JSON.parse(
    await (await exportReport({ ...c, format: "GeoJSON" }, data)).text(),
  );
  assert.equal(json.features.length, 3);
  assert.equal(json.features[0].properties.pais, "Bolivia");
  assert.deepEqual(json.features[0].geometry.coordinates, [-66.17, -17.39]);
});

test("downloads enforce selected country, continent, date and extent", async () => {
  const c = {
    ...liveConfig(
      { ...filters, country: "BOL", continent: "América del Sur" },
      [-70, -23, -57, -9],
    ),
    format: "GeoJSON" as const,
  };
  const records = [
    ...data.map((d) => ({ ...d, continent: "América del Sur" })),
    { ...data[0], id: "outside", longitude: 100, continent: "América del Sur" },
    { ...data[0], id: "old", date: "1999-01-01", continent: "América del Sur" },
  ];
  const json = JSON.parse(await (await exportReport(c, records)).text());
  assert.equal(json.features.length, 1);
  assert.equal(json.features[0].properties.pais, "Bolivia");
  assert.equal(
    reportFilename(c, "geojson"),
    "llamita-bolivia-2000-01-01_2026-11-15.geojson",
  );
  const continent = {
    ...c,
    country: "",
    bbox: [-180, -90, 180, 90] as [number, number, number, number],
  };
  const worldwide = {
    ...records[0],
    id: "kenya",
    countryCode: "KEN",
    country: "Kenia",
    continent: "África",
  };
  const selected = JSON.parse(
    await (await exportReport(continent, [...records, worldwide])).text(),
  );
  assert.ok(
    selected.features.every(
      (f: { properties: { pais: string } }) => f.properties.pais !== "Kenia",
    ),
  );
});
