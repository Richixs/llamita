export const GAMC_BASE_URL = "https://serviciosgamc.cochabamba.bo/api/gs/wms";

// Thematic layers confirmed via a manual GetCapabilities request against
// the GAMC WMS (the official snippets never document how to list them).
// "svc_*" style variants and the GeoServer demo layers (spearfish, tasmania,
// tiger-ny) are intentionally excluded.
export const GAMC_LAYERS = [
  "areas_de_equipamiento",
  "areas_verdes",
  "centros_de_salud",
  "cota_2750",
  "cuencas_de_influencia",
  "cuencas_principales",
  "cuencas_uh_8",
  "drenaje_e_influencia",
  "emergencias",
  "limite_cercado",
  "limite_distritos",
  "limite_urbano",
  "periurbanos",
  "poblacion_por_mazanas",
  "unidades_educativas",
] as const;

export const DEFAULT_SRS = "EPSG:3857";
export const DEFAULT_WMS_VERSION = "1.1.1";
export const MIN_TILE_SIZE = 1;
export const MAX_TILE_SIZE = 2048;

// GetFeatureInfo on this service has been observed to ignore LAYERS/
// QUERY_LAYERS and always return the "periurbanos" attribute schema
// ({ Detalle, Periurbano }), regardless of the layer actually requested.
// Confirmed against limite_urbano, cuencas_principales and cota_2750.
export const KNOWN_FEATURE_INFO_BUG_WARNING =
  "GAMC's GetFeatureInfo has been observed to ignore the requested layer " +
  "and return attributes from the periurbanos dataset instead. Verify the " +
  "returned property names match what you expect before trusting them.";
