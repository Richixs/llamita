import { getAreaHotspots, getDataAvailability } from "./client";
import { FirmsUpstreamError, FirmsValidationError } from "./errors";
import { parseAreaCoordinates, parseDateParam } from "./validation";
import type { FirmsHotspot, FirmsSource } from "./types";
import type { Detection } from "@/lib/llamita/data";
import { MAX_QUERY_DAYS, type Bbox } from "@/lib/geo/catalog";
import { findMunicipality, findProvince } from "@/lib/geo/boundaries";
const DAY = 86400000;
// Parallel FIRMS requests per hotspot query. Higher cuts wall-clock time for
// wide date ranges (up to MAX_QUERY_DAYS), but the MAP_KEY quota (5000
// transactions/10min) is shared across every concurrent user of this app.
const UPSTREAM_CONCURRENCY = 6;
export interface HotspotQuery {
  from: string;
  to: string;
  bbox: Bbox;
  sensor: "all" | "VIIRS" | "MODIS";
}
export interface HotspotResult {
  data: Detection[];
  fetchedAt: string;
  warnings: string[];
  bbox: Bbox;
  from: string;
  to: string;
}
export function parseHotspotQuery(params: URLSearchParams): HotspotQuery {
  const from = parseDateParam(params.get("from"));
  const to = parseDateParam(params.get("to"));
  if (!from || !to)
    throw new FirmsValidationError("Selecciona las fechas de inicio y fin.");
  const days = (Date.parse(to) - Date.parse(from)) / DAY + 1;
  if (days < 1 || days > MAX_QUERY_DAYS)
    throw new FirmsValidationError(
      `Las consultas reales admiten entre 1 y ${MAX_QUERY_DAYS} días. Divide los periodos más largos.`,
    );
  const coordinates = parseAreaCoordinates(params.get("bbox"));
  if (coordinates === "world")
    throw new FirmsValidationError(
      "Selecciona un área rectangular para la consulta.",
    );
  const bounds = coordinates.split(",").map(Number);
  if (bounds[2] - bounds[0] > 10 || bounds[3] - bounds[1] > 10)
    throw new FirmsValidationError(
      "Selecciona un área de hasta 10 grados de ancho y alto.",
    );
  const sensor = params.get("sensor") || "all";
  if (!["all", "VIIRS", "MODIS"].includes(sensor))
    throw new FirmsValidationError("El sensor debe ser all, VIIRS o MODIS.");
  return {
    from,
    to,
    bbox: coordinates.split(",").map(Number) as Bbox,
    sensor: sensor as HotspotQuery["sensor"],
  };
}
export function dateChunks(from: string, to: string, maxDays = 5) {
  const chunks: { date: string; dayRange: number }[] = [];
  for (
    let t = Date.parse(from), end = Date.parse(to);
    t <= end;
    t += maxDays * DAY
  )
    chunks.push({
      date: new Date(t).toISOString().slice(0, 10),
      dayRange: Math.min(maxDays, Math.round((end - t) / DAY) + 1),
    });
  return chunks;
}
export function toDetection(row: FirmsHotspot, source: FirmsSource): Detection {
  const time = String(row.acq_time).padStart(4, "0");
  const hours = Number(time.slice(0, 2)),
    minutes = Number(time.slice(2));
  if (hours > 23 || minutes > 59)
    throw new FirmsUpstreamError(
      "NASA FIRMS devolvió una hora de detección inválida.",
      502,
    );
  const utc = `${row.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
  const local = new Date(Date.parse(utc) - 4 * 3600000).toISOString();
  return {
    id: `firms-${source}-${row.acq_date}-${time}-${row.latitude}-${row.longitude}-${row.satellite}`,
    origin: "live",
    source,
    municipality: findMunicipality(row.latitude, row.longitude),
    province: findProvince(row.latitude, row.longitude),
    date: local.slice(0, 10),
    time: local.slice(11, 16),
    frp: row.frp,
    satellite: source.startsWith("MODIS") ? "MODIS" : "VIIRS",
    protectedArea: "",
    territory: "",
    latitude: row.latitude,
    longitude: row.longitude,
    x: row.longitude,
    y: row.latitude,
  };
}
async function fetchHotspots(query: HotspotQuery): Promise<HotspotResult> {
  const viirs: FirmsSource[] = [
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
  ];
  const sources =
    query.sensor === "VIIRS"
      ? viirs
      : query.sensor === "MODIS"
        ? ["MODIS_NRT" as const]
        : [...viirs, "MODIS_NRT" as const];
  const availability = await getDataAvailability("all");
  // FIRMS dates are UTC. A Bolivia calendar day ends at 04:00 UTC next day.
  const utcEnd = new Date(Date.parse(query.to) + DAY)
    .toISOString()
    .slice(0, 10);
  const tasks: { source: FirmsSource; date: string; dayRange: number }[] = [];
  const warnings: string[] = [];
  for (const source of sources) {
    const dates = availability.find((a) => a.data_id === source);
    if (!dates) {
      warnings.push(`No se pudo confirmar la disponibilidad de ${source}.`);
      continue;
    }
    const from = query.from > dates.min_date ? query.from : dates.min_date;
    const to = utcEnd < dates.max_date ? utcEnd : dates.max_date;
    if (from > to) {
      warnings.push(`${source} no dispone de datos en el periodo elegido.`);
      continue;
    }
    if (from !== query.from || to !== utcEnd)
      warnings.push(
        `${source}: cobertura UTC disponible del ${dates.min_date} al ${dates.max_date}. El periodo puede estar incompleto.`,
      );
    tasks.push(...dateChunks(from, to).map((c) => ({ ...c, source })));
  }
  const unique = new Map<string, Detection>();
  let completed = 0;
  let failed = 0;
  // Limit upstream concurrency and never retry implicitly against the user's quota.
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const task = tasks[next++];
      try {
        const rows = await getAreaHotspots({
          ...task,
          coordinates: query.bbox.join(","),
        });
        const converted = rows.map((row) => toDetection(row, task.source));
        for (const d of converted) {
          if (
            d.date < query.from ||
            d.date > query.to ||
            d.longitude < query.bbox[0] ||
            d.longitude > query.bbox[2] ||
            d.latitude < query.bbox[1] ||
            d.latitude > query.bbox[3]
          )
            continue;
          unique.set(d.id, d);
        }
        completed++;
      } catch (error) {
        failed++;
        warnings.push(
          `${task.source} (${task.date}): ${error instanceof FirmsUpstreamError ? error.message : "No se pudo completar la consulta."}`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: UPSTREAM_CONCURRENCY }, worker));
  if (failed && !completed)
    throw new FirmsUpstreamError(
      "No se pudieron obtener detecciones de NASA FIRMS. Comprueba la clave, la disponibilidad y la cuota e intenta nuevamente.",
      502,
    );
  return {
    data: [...unique.values()].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.time.localeCompare(a.time) ||
        a.id.localeCompare(b.id),
    ),
    warnings: [...new Set(warnings)],
    fetchedAt: new Date().toISOString(),
    bbox: query.bbox,
    from: query.from,
    to: query.to,
  };
}

const cache = new Map<
  string,
  { expires: number; promise: Promise<HotspotResult> }
>();
export function queryHotspots(query: HotspotQuery): Promise<HotspotResult> {
  const key = JSON.stringify(query),
    existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const promise: Promise<HotspotResult> = fetchHotspots(query).catch(
    (error) => {
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw error;
    },
  );
  cache.set(key, { expires: Date.now() + 5 * 60 * 1000, promise });
  while (cache.size > 8) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  return promise;
}
