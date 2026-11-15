import {
  DEFAULT_SRS,
  DEFAULT_WMS_VERSION,
  GAMC_LAYERS,
  MAX_TILE_SIZE,
  MIN_TILE_SIZE,
} from "./constants";
import { GamcValidationError } from "./errors";
import type { GamcLayer } from "./types";

const SRS_PATTERN = /^EPSG:\d+$/i;

export function parseLayer(value: string | null): GamcLayer {
  if (!value || !GAMC_LAYERS.includes(value as GamcLayer)) {
    throw new GamcValidationError(
      `"layer" must be one of: ${GAMC_LAYERS.join(", ")}`,
    );
  }
  return value as GamcLayer;
}

// GAMC's BBOX is in the request's SRS units (meters for EPSG:3857, degrees
// for EPSG:4326), so unlike FIRMS this can't be range-checked against
// lat/lon bounds — only shape and ordering are validated.
export function parseBbox(value: string | null): string {
  if (!value) {
    throw new GamcValidationError('"bbox" is required: "west,south,east,north"');
  }
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 4) {
    throw new GamcValidationError('"bbox" must have 4 values: west,south,east,north');
  }
  const [west, south, east, north] = parts.map(Number);
  if ([west, south, east, north].some((n) => !Number.isFinite(n))) {
    throw new GamcValidationError('"bbox" values must be numbers');
  }
  if (west >= east || south >= north) {
    throw new GamcValidationError('"bbox" must satisfy west < east and south < north');
  }
  return `${west},${south},${east},${north}`;
}

export function parseTileSize(value: string | null, paramName: "width" | "height"): number {
  const size = Number(value);
  if (!Number.isInteger(size) || size < MIN_TILE_SIZE || size > MAX_TILE_SIZE) {
    throw new GamcValidationError(
      `"${paramName}" must be an integer between ${MIN_TILE_SIZE} and ${MAX_TILE_SIZE}`,
    );
  }
  return size;
}

export function parsePixel(value: string | null, paramName: "x" | "y", bound: number): number {
  const pixel = Number(value);
  if (!Number.isInteger(pixel) || pixel < 0 || pixel >= bound) {
    throw new GamcValidationError(`"${paramName}" must be an integer between 0 and ${bound - 1}`);
  }
  return pixel;
}

export function parseSrs(value: string | null): string {
  if (!value) {
    return DEFAULT_SRS;
  }
  if (!SRS_PATTERN.test(value)) {
    throw new GamcValidationError('"srs" must look like "EPSG:<code>"');
  }
  return value.toUpperCase();
}

export function parseVersion(value: string | null): string {
  return value ?? DEFAULT_WMS_VERSION;
}

export function parseTransparent(value: string | null): boolean {
  return value !== "false";
}

export function parseFeatureCount(value: string | null): number {
  if (!value) {
    return 5;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new GamcValidationError('"featureCount" must be an integer between 1 and 50');
  }
  return count;
}
