export const FIRMS_BASE_URL = "https://firms.modaps.eosdis.nasa.gov";

// Sources documented at https://firms.modaps.eosdis.nasa.gov/api/area
export const FIRMS_SOURCES = [
  "LANDSAT_NRT",
  "MODIS_NRT",
  "MODIS_SP",
  "VIIRS_NOAA20_NRT",
  "VIIRS_SNPP_NRT",
  "VIIRS_SNPP_SP",
] as const;

export const MIN_DAY_RANGE = 1;
export const MAX_DAY_RANGE = 10;
