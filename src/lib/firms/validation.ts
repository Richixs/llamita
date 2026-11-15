import { FIRMS_SOURCES, MAX_DAY_RANGE, MIN_DAY_RANGE } from "./constants";
import { FirmsValidationError } from "./errors";
import type { FirmsAvailabilitySensor, FirmsSource } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{3}$/;

export function parseSource(value: string | null): FirmsSource {
  if (!value || !FIRMS_SOURCES.includes(value as FirmsSource)) {
    throw new FirmsValidationError(
      `"source" must be one of: ${FIRMS_SOURCES.join(", ")}`,
    );
  }
  return value as FirmsSource;
}

export function parseAvailabilitySensor(
  value: string | null,
): FirmsAvailabilitySensor {
  if (!value || value === "all") {
    return "all";
  }
  return parseSource(value);
}

// AREA_COORDINATES is either the literal "world" or "west,south,east,north".
export function parseAreaCoordinates(value: string | null): string {
  if (!value) {
    throw new FirmsValidationError(
      '"bbox" is required (e.g. "-70,-23,-57,-9" or "world")',
    );
  }
  if (value.trim().toLowerCase() === "world") {
    return "world";
  }

  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 4) {
    throw new FirmsValidationError(
      '"bbox" must have 4 values: west,south,east,north',
    );
  }

  const [west, south, east, north] = parts.map(Number);
  if ([west, south, east, north].some((n) => !Number.isFinite(n))) {
    throw new FirmsValidationError('"bbox" values must be numbers');
  }
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    throw new FirmsValidationError('"bbox" values are out of range');
  }
  if (west >= east || south >= north) {
    throw new FirmsValidationError(
      '"bbox" must satisfy west < east and south < north',
    );
  }

  return `${west},${south},${east},${north}`;
}

export function parseDayRange(value: string | null): number {
  if (!value) {
    return MIN_DAY_RANGE;
  }
  const dayRange = Number(value);
  if (
    !Number.isInteger(dayRange) ||
    dayRange < MIN_DAY_RANGE ||
    dayRange > MAX_DAY_RANGE
  ) {
    throw new FirmsValidationError(
      `"dayRange" must be an integer between ${MIN_DAY_RANGE} and ${MAX_DAY_RANGE}`,
    );
  }
  return dayRange;
}

export function parseDateParam(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  if (!DATE_PATTERN.test(value)) {
    throw new FirmsValidationError('"date" must use the YYYY-MM-DD format');
  }
  return value;
}

export function parseCountryCode(value: string | null): string {
  if (!value || !COUNTRY_CODE_PATTERN.test(value)) {
    throw new FirmsValidationError(
      '"code" must be a 3-letter country code (e.g. "BOL")',
    );
  }
  return value.toUpperCase();
}
