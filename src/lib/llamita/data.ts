import artwork from "@/lib/map/artwork.json";
import markers from "@/lib/map/day-markers.json";
import type { Filters } from "./filters";

// Illustrative geometry and marker positions supplied in the Figma exports.
// This fixture is intentionally separate from the existing NASA FIRMS API.
const places: [string, string][] = [
  ["Cochabamba", "Cercado"],
  ["Quillacollo", "Quillacollo"],
  ["Sipe Sipe", "Quillacollo"],
  ["Tiquipaya", "Quillacollo"],
  ["Colcapirhua", "Quillacollo"],
  ["Vinto", "Quillacollo"],
  ["Sacaba", "Chapare"],
  ["Colomi", "Chapare"],
  ["Villa Tunari", "Chapare"],
  ["Totora", "Carrasco"],
  ["Pojo", "Carrasco"],
  ["Pocona", "Carrasco"],
  ["Chimoré", "Carrasco"],
  ["Puerto Villarroel", "Carrasco"],
  ["Entre Ríos", "Carrasco"],
  ["Tolata", "Germán Jordán"],
  ["Cliza", "Germán Jordán"],
  ["Arbieto", "Esteban Arze"],
  ["San Benito", "Punata"],
  ["Punata", "Punata"],
  ["Toco", "Germán Jordán"],
  ["Villa Rivero", "Punata"],
  ["Tacachi", "Punata"],
  ["Tarata", "Esteban Arze"],
  ["Anzaldo", "Esteban Arze"],
  ["Santiváñez", "Capinota"],
  ["Alalay", "Mizque"],
  ["Cuchumuela", "Punata"],
  ["Vacas", "Arani"],
  ["Arque", "Arque"],
  ["Tacopaya", "Arque"],
  ["Independencia", "Ayopaya"],
  ["Morochata", "Ayopaya"],
  ["Cocapata", "Ayopaya"],
  ["Bolívar", "Bolívar"],
  ["Aiquile", "Narciso Campero"],
  ["Pasorapa", "Narciso Campero"],
  ["Omereque", "Narciso Campero"],
  ["Capinota", "Capinota"],
  ["Sicaya", "Capinota"],
  ["Sacabamba", "Esteban Arze"],
  ["Mizque", "Mizque"],
  ["Vila Vila", "Mizque"],
  ["Arani", "Arani"],
  ["Tapacarí", "Tapacarí"],
  ["Tiraque", "Tiraque"],
  ["Shinahota", "Tiraque"],
];
// Use the municipality names present in the reference; no official boundaries
// or territorial overlays should be inferred from these display-only paths.
export const municipalities = artwork.polygons.map((polygon, index) => ({
  ...polygon,
  name: places[index][0],
  province: places[index][1],
}));
export const provinces = [
  ...new Set(municipalities.map((m) => m.province)),
].sort();
export const territories = ["TIPNIS", "Yuracaré", "Yuqui"];
export const protectedAreas = ["PN Carrasco", "TIPNIS"];
export interface Detection {
  origin?: "live" | "demo";
  source?: string;
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
const centers: [string, number, number][] = [
  ["Villa Tunari", 926, 315],
  ["Puerto Villarroel", 1117, 413],
  ["Chimoré", 1096, 362],
  ["Entre Ríos", 1170, 505],
  ["Shinahota", 994, 438],
  ["Cocapata", 700, 296],
  ["Pojo", 1128, 579],
  ["Independencia", 633, 463],
  ["Totora", 1032, 580],
  ["Tiraque", 957, 506],
  ["Colomi", 773, 485],
  ["Sacaba", 817, 510],
  ["Aiquile", 1051, 767],
  ["Pasorapa", 1164, 785],
  ["Mizque", 978, 712],
  ["Morochata", 683, 480],
];
const frpValues = [2.8, 7.4, 18.6, 36.2, 62.3];
const colors = ["#FFE3A3", "#F7B24A", "#E4632B", "#C2361C", "#7A1A10"];
export function heatColor(frp: number) {
  return colors[frp < 5 ? 0 : frp < 10 ? 1 : frp < 25 ? 2 : frp <= 50 ? 3 : 4];
}
function detection(
  name: string,
  x: number,
  y: number,
  i: number,
  day: number,
  frp = frpValues[i % 5],
): Detection {
  const place = municipalities.find((m) => m.name === name)!;
  return {
    id: `demo-${day}-${i}`,
    municipality: name,
    province: place.province,
    date: `2026-11-${String(day).padStart(2, "0")}`,
    time: i % 2 ? "01:48" : "02:14",
    frp,
    satellite: i % 5 ? "VIIRS" : "MODIS",
    protectedArea: i % 5 === 0 ? "PN Carrasco" : i % 8 === 0 ? "TIPNIS" : "",
    territory: i % 7 === 0 ? territories[i % 3] : "",
    x,
    y,
    // Approximate coordinates for the illustrative dataset, never live locations.
    latitude: Number((-15.8 - (y - 110) * 0.0041).toFixed(4)),
    longitude: Number((-67.6 + (x - 570) * 0.0047).toFixed(4)),
  };
}
const daily = markers.map((p, i) => {
  const nearest = centers.toSorted(
    (a, b) =>
      (a[1] - p.x) ** 2 +
      (a[2] - p.y) ** 2 -
      ((b[1] - p.x) ** 2 + (b[2] - p.y) ** 2),
  )[0];
  return detection(
    nearest[0],
    p.x,
    p.y,
    i,
    14,
    frpValues[colors.indexOf(p.color)],
  );
});
const totals: [string, number][] = [
  ["Villa Tunari", 412],
  ["Puerto Villarroel", 233],
  ["Chimoré", 198],
  ["Entre Ríos", 141],
  ["Shinahota", 87],
  ["Cocapata", 54],
  ["Pojo", 38],
  ["Independencia", 31],
  ["Totora", 24],
  ["Tiraque", 19],
  ["Colomi", 9],
  ["Sacaba", 9],
  ["Aiquile", 8],
  ["Pasorapa", 8],
  ["Mizque", 7],
  ["Morochata", 6],
];
const previous: Detection[] = [];
// Preserve the daily trend from the design, scaled to the remaining 942 points.
const dayWeights = [42, 55, 61, 78, 96, 120, 134, 151, 186, 112, 88, 70, 64];
const weightTotal = dayWeights.reduce((sum, value) => sum + value, 0);
function previousDay(index: number) {
  const slot = (((index * 317) % 942) / 942) * weightTotal;
  let cumulative = 0;
  for (let i = 0; i < dayWeights.length; i++) {
    cumulative += dayWeights[i];
    if (slot < cumulative) return i + 1;
  }
  return 13;
}
for (const [name, total] of totals) {
  const count = daily.filter((d) => d.municipality === name).length;
  const center = centers.find((c) => c[0] === name)!;
  for (let i = 0; i < total - count; i++) {
    const index = previous.length;
    previous.push(
      detection(
        name,
        center[1] + Math.sin(index * 7.13) * 26,
        center[2] + Math.cos(index * 3.71) * 18,
        index,
        previousDay(index),
      ),
    );
  }
}
export const detections = [...daily, ...previous].sort(
  (a, b) =>
    b.date.localeCompare(a.date) ||
    b.time.localeCompare(a.time) ||
    a.id.localeCompare(b.id),
);
export function filterDetections(filters: Filters, source = detections) {
  const from = filters.mode === "day" ? filters.to : filters.from;
  return source.filter(
    (d) =>
      d.date >= from &&
      d.date <= filters.to &&
      (!filters.province || d.province === filters.province) &&
      (!filters.municipality || d.municipality === filters.municipality) &&
      (!filters.territory || d.territory === filters.territory) &&
      (!filters.protectedArea || d.protectedArea === filters.protectedArea) &&
      (filters.satellite === "all" || d.satellite === filters.satellite),
  );
}
export function ranking(
  data: Detection[],
  key: "municipality" | "province" | "protectedArea",
) {
  const counts = new Map<string, number>();
  for (const d of data) {
    const name = d[key] || "Fuera de áreas";
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
export function byDay(data: Detection[], from: string, to: string) {
  const result: { name: string; count: number }[] = [];
  if (!from || !to || from > to) return result;
  for (
    let t = Date.parse(from);
    t <= Date.parse(to) && result.length < 366;
    t += 86400000
  ) {
    const name = new Date(t).toISOString().slice(0, 10);
    result.push({ name, count: data.filter((d) => d.date === name).length });
  }
  return result;
}
