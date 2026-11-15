export type Bbox = [west: number, south: number, east: number, north: number];
export const WORLD_BBOX: Bbox = [-180, -90, 180, 90];
export const MIN_HISTORY_DATE = "2000-01-01";
export const MAX_GLOBAL_QUERY_DAYS = 5;
export function isWideArea(bbox: Bbox) {
  return bbox[2] - bbox[0] > 10 || bbox[3] - bbox[1] > 10;
}
export const GAMC_BBOX: Bbox = [-66.280703, -17.53119, -66.06952, -17.257306];
// A rectangular regional query, not an administrative boundary.
export const REGIONAL_BBOX: Bbox = [-67.9, -18.9, -63.5, -15.5];
export const GAMC_LAYERS = [
  {
    id: "periurbanos",
    name: "Periurbanos",
    serviceId: "c52066a1-32fd-4925-81e0-c2dcb8f4238f",
    bbox: [-66.275711, -17.525117, -66.072201, -17.326109] as Bbox,
  },
  {
    id: "cota-2750",
    name: "Cota 2750",
    serviceId: "297cefa4-0832-42bb-a98e-2cbea989fd9d",
    bbox: [-66.193763, -17.367136, -66.103902, -17.257306] as Bbox,
  },
  {
    id: "distritos",
    name: "Límite Distritos",
    serviceId: "7eb13092-bf0e-493b-aae6-03c43eedda2c",
    bbox: GAMC_BBOX,
  },
] as const;
export type GamcLayerId = (typeof GAMC_LAYERS)[number]["id"];
// 366, not 365, so a full calendar year still fits in a leap year.
export const MAX_QUERY_DAYS = 366;
export function boliviaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function mercator(lon: number, lat: number): [number, number] {
  const phi =
    (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  return [
    (6378137 * lon * Math.PI) / 180,
    6378137 * Math.log(Math.tan(Math.PI / 4 + phi / 2)),
  ];
}
