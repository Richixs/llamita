import { FIRMS_BASE_URL } from "./constants";
import { parseCsv } from "./csv";
import {
  FirmsConfigError,
  FirmsUnavailableError,
  FirmsUpstreamError,
} from "./errors";
import {
  parseAreaCoordinates,
  parseDateParam,
  parseDayRange,
  parseSource,
} from "./validation";
import type {
  FirmsAvailability,
  FirmsAvailabilitySensor,
  FirmsCountry,
  FirmsHotspot,
  FirmsKeyStatus,
  FirmsSource,
} from "./types";
function getMapKey() {
  const key = process.env.FIRMS_MAP_KEY?.trim();
  if (!key)
    throw new FirmsConfigError(
      "Falta configurar FIRMS_MAP_KEY en el servidor.",
    );
  return key;
}
async function fetchFirmsText(path: string) {
  let response: Response;
  try {
    response = await fetch(`${FIRMS_BASE_URL}${path}`, {
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
  } catch {
    throw new FirmsUpstreamError(
      "No se pudo conectar con NASA FIRMS. Intenta nuevamente.",
      502,
    );
  }
  // Do not echo the upstream response: it may contain the key or the full URL.
  if (!response.ok)
    throw new FirmsUpstreamError(
      `NASA FIRMS rechazó la consulta (HTTP ${response.status}).`,
      response.status,
    );
  const body = await response.text();
  if (
    /^(?:invalid|error|map_key|maximum|too many|exceeded)/i.test(body.trim()) ||
    /^\s*</.test(body)
  )
    throw new FirmsUpstreamError(
      "NASA FIRMS no devolvió datos válidos. Comprueba la clave, la disponibilidad y la cuota del servicio.",
      502,
    );
  return body;
}
export async function getMapKeyStatus(): Promise<FirmsKeyStatus> {
  const text = await fetchFirmsText(
    `/mapserver/mapkey_status/?MAP_KEY=${encodeURIComponent(getMapKey())}`,
  );
  try {
    const result = JSON.parse(text);
    if (
      typeof result.current_transactions !== "number" ||
      typeof result.transaction_limit !== "number"
    )
      throw new Error();
    return result;
  } catch {
    throw new FirmsUpstreamError(
      "NASA FIRMS no devolvió un estado de clave válido.",
      502,
    );
  }
}
export async function getDataAvailability(
  sensor: FirmsAvailabilitySensor,
): Promise<FirmsAvailability[]> {
  const text = await fetchFirmsText(
    `/api/data_availability/csv/${encodeURIComponent(getMapKey())}/${sensor === "all" ? "ALL" : parseSource(sensor)}`,
  );
  const rows = parseCsv(text);
  if (
    !rows.length ||
    rows.some(
      (r) =>
        !r.data_id ||
        !parseDateParam(r.min_date) ||
        !parseDateParam(r.max_date),
    )
  )
    throw new FirmsUpstreamError(
      "NASA FIRMS no devolvió información de disponibilidad válida.",
      502,
    );
  return rows as unknown as FirmsAvailability[];
}
export async function getAreaHotspots(params: {
  source: FirmsSource;
  coordinates: string;
  dayRange: number;
  date?: string;
}): Promise<FirmsHotspot[]> {
  const segments = [
    getMapKey(),
    parseSource(params.source),
    parseAreaCoordinates(params.coordinates),
    String(parseDayRange(String(params.dayRange))),
  ];
  if (params.date) segments.push(parseDateParam(params.date)!);
  const text = await fetchFirmsText(
    `/api/area/csv/${[encodeURIComponent(segments[0]), ...segments.slice(1)].join("/")}`,
  );
  if (!text.trim() || /^no (?:data|fire)/i.test(text.trim())) return [];
  const header = text
    .split(/\r?\n/, 1)[0]
    .split(",")
    .map((h) => h.trim().replaceAll('"', ""));
  if (
    !["latitude", "longitude", "acq_date", "acq_time", "frp"].every((h) =>
      header.includes(h),
    )
  )
    throw new FirmsUpstreamError(
      "NASA FIRMS no devolvió un CSV de detecciones válido.",
      502,
    );
  return parseCsv(text).map((row) => {
    const latitude = Number(row.latitude),
      longitude = Number(row.longitude),
      frp = Number(row.frp);
    if (
      !row.latitude ||
      !row.longitude ||
      !row.frp ||
      ![latitude, longitude, frp].every(Number.isFinite) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      frp < 0 ||
      !/^\d{1,4}$/.test(row.acq_time) ||
      !parseDateParam(row.acq_date)
    )
      throw new FirmsUpstreamError(
        "NASA FIRMS devolvió una detección inválida.",
        502,
      );
    return { ...row, latitude, longitude, frp } as FirmsHotspot;
  });
}
export async function getCountries(): Promise<FirmsCountry[]> {
  throw new FirmsUnavailableError(
    "NASA tiene deshabilitado el catálogo countries. Consulta detecciones por coordenadas en /api/firms/area o /api/firms/hotspots.",
  );
}
export async function getCountryHotspots(_params: {
  source: FirmsSource;
  countryCode: string;
  dayRange: number;
  date?: string;
}): Promise<FirmsHotspot[]> {
  void _params;
  throw new FirmsUnavailableError(
    "NASA tiene deshabilitado el servicio country. Utiliza /api/firms/area o /api/firms/hotspots con un BBOX; un rectángulo no sustituye los límites oficiales del país.",
  );
}
