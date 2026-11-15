import type { Filters } from "./filters";
export interface Detection {
  origin?: "live";
  source?: string;
  continent?: string;
  country?: string;
  countryCode?: string;
  id: string;
  municipality: string;
  province: string;
  date: string;
  time: string;
  frp: number;
  satellite: "VIIRS" | "MODIS";
  protectedArea: string;
  territory: string;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  // Set when this record merges several raw sensor pixels onto a common
  // ~1km grid cell (see src/lib/firms/grid.ts): the FIRMS products that
  // detected it, and how many raw pixels were collapsed into this point.
  detectedBy?: string[];
  observationCount?: number;
}
const colors = ["#FFE3A3", "#F7B24A", "#E4632B", "#C2361C", "#7A1A10"];
export function heatColor(frp: number) {
  return colors[frp < 5 ? 0 : frp < 10 ? 1 : frp < 25 ? 2 : frp <= 50 ? 3 : 4];
}
export function filterDetections(filters: Filters, source: Detection[]) {
  const from = filters.mode === "day" ? filters.to : filters.from;
  return source.filter(
    (d) =>
      d.date >= from &&
      d.date <= filters.to &&
      (!filters.continent || d.continent === filters.continent) &&
      (!filters.country || d.countryCode === filters.country) &&
      (!filters.province || d.province === filters.province) &&
      (!filters.municipality || d.municipality === filters.municipality) &&
      (!filters.territory || d.territory === filters.territory) &&
      (!filters.protectedArea || d.protectedArea === filters.protectedArea) &&
      (filters.satellite === "all" || d.satellite === filters.satellite),
  );
}
export function ranking(
  data: Detection[],
  key: "country" | "satellite" | "municipality" | "province" | "protectedArea",
) {
  const counts = new Map<string, number>();
  for (const d of data) {
    const name =
      d[key] || (key === "protectedArea" ? "Fuera de áreas" : "Sin asignar");
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
export function byDay(data: Detection[], from: string, to: string) {
  const result: { name: string; count: number }[] = [];
  if (!from || !to || from > to) return result;
  const counts = new Map<string, number>();
  for (const d of data) counts.set(d.date, (counts.get(d.date) || 0) + 1);
  for (
    let t = Date.parse(from);
    t <= Date.parse(to) && result.length < 10000;
    t += 86400000
  ) {
    const name = new Date(t).toISOString().slice(0, 10);
    result.push({ name, count: counts.get(name) || 0 });
  }
  return result;
}
