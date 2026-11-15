import type { FIRMS_SOURCES } from "./constants";

export type FirmsSource = (typeof FIRMS_SOURCES)[number];

export type FirmsAvailabilitySensor = FirmsSource | "all";

export interface FirmsKeyStatus {
  current_transactions: number;
  transaction_limit: number;
  transaction_interval: string;
}

export interface FirmsAvailability {
  data_id: string;
  min_date: string;
  max_date: string;
}

export interface FirmsCountry {
  id: string;
  name: string;
  extent: [west: number, south: number, east: number, north: number];
}

// Columns vary slightly per sensor (e.g. MODIS uses "brightness"/"bright_t31",
// VIIRS uses "bright_ti4"/"bright_ti5"), so only the shared fields are typed
// and the rest stay available through the index signature.
export interface FirmsHotspot {
  latitude: number;
  longitude: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  version: string;
  frp: number;
  daynight: string;
  [column: string]: string | number;
}
