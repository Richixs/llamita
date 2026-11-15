import { FIRMS_BASE_URL } from "./constants";
import { parseCsv } from "./csv";
import { FirmsConfigError, FirmsUpstreamError } from "./errors";
import type {
  FirmsAvailability,
  FirmsAvailabilitySensor,
  FirmsCountry,
  FirmsHotspot,
  FirmsKeyStatus,
  FirmsSource,
} from "./types";

function getMapKey(): string {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    throw new FirmsConfigError("FIRMS_MAP_KEY environment variable is not set");
  }
  return mapKey;
}

async function fetchFirmsText(path: string): Promise<string> {
  const response = await fetch(`${FIRMS_BASE_URL}${path}`, {
    cache: "no-store",
  });
  const body = await response.text();
  if (!response.ok) {
    throw new FirmsUpstreamError(
      `FIRMS request failed: ${body || response.statusText}`,
      response.status,
    );
  }
  return body;
}

export async function getMapKeyStatus(): Promise<FirmsKeyStatus> {
  const mapKey = getMapKey();
  const text = await fetchFirmsText(
    `/mapserver/mapkey_status/?MAP_KEY=${mapKey}`,
  );
  return JSON.parse(text) as FirmsKeyStatus;
}

export async function getDataAvailability(
  sensor: FirmsAvailabilitySensor,
): Promise<FirmsAvailability[]> {
  const mapKey = getMapKey();
  const text = await fetchFirmsText(
    `/api/data_availability/csv/${mapKey}/${sensor}`,
  );
  return parseCsv(text) as unknown as FirmsAvailability[];
}

export async function getAreaHotspots(params: {
  source: FirmsSource;
  coordinates: string;
  dayRange: number;
  date?: string;
}): Promise<FirmsHotspot[]> {
  const mapKey = getMapKey();
  const segments = [
    mapKey,
    params.source,
    params.coordinates,
    String(params.dayRange),
  ];
  if (params.date) {
    segments.push(params.date);
  }
  const text = await fetchFirmsText(`/api/area/csv/${segments.join("/")}`);
  return rowsToHotspots(parseCsv(text));
}

// No MAP_KEY required per https://firms.modaps.eosdis.nasa.gov/api/countries
export async function getCountries(): Promise<FirmsCountry[]> {
  const text = await fetchFirmsText("/api/countries");
  return parseCsv(text, ";").map(rowToCountry);
}

function rowToCountry(row: Record<string, string>): FirmsCountry {
  const extent = row.extent
    ? row.extent.split(/\s+/).map(Number)
    : [row.min_x, row.min_y, row.max_x, row.max_y].map(Number);

  return {
    id: row.id,
    name: row.name,
    extent: [extent[0], extent[1], extent[2], extent[3]],
  };
}

export async function getCountryHotspots(params: {
  source: FirmsSource;
  countryCode: string;
  dayRange: number;
  date?: string;
}): Promise<FirmsHotspot[]> {
  const mapKey = getMapKey();
  const segments = [
    mapKey,
    params.source,
    params.countryCode,
    String(params.dayRange),
  ];
  if (params.date) {
    segments.push(params.date);
  }
  const text = await fetchFirmsText(`/api/country/csv/${segments.join("/")}`);
  return rowsToHotspots(parseCsv(text));
}

function rowsToHotspots(rows: Record<string, string>[]): FirmsHotspot[] {
  return rows.map((row) => {
    const hotspot: Record<string, string | number> = { ...row };
    hotspot.latitude = Number(row.latitude);
    hotspot.longitude = Number(row.longitude);
    hotspot.frp = Number(row.frp);
    return hotspot as unknown as FirmsHotspot;
  });
}
