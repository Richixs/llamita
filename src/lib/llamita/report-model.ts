import { byDay, ranking, type Detection } from "./data";
import type { ReportConfig } from "./report";
export function reportRankings(data: Detection[]) {
  return {
    countries: ranking(data, "country"),
    sensors: ranking(data, "satellite"),
    municipalities: ranking(data, "municipality").filter(
      (v) => v.name !== "Sin asignar",
    ),
    provinces: ranking(data, "province").filter(
      (v) => v.name !== "Sin asignar",
    ),
  };
}
export type ReportPage = {
  kind: "overview" | "ranking" | "local-ranking" | "warnings" | "table";
  offset: number;
};
export function reportPlan(
  config: ReportConfig,
  data: Detection[],
): ReportPage[] {
  const pages: ReportPage[] = [{ kind: "overview", offset: 0 }];
  if (config.sections.includes("ranking")) {
    pages.push({ kind: "ranking", offset: 0 });
    if (data.some((d) => d.municipality && d.municipality !== "Sin asignar"))
      pages.push({ kind: "local-ranking", offset: 0 });
  }
  for (let i = 0; i < (config.warnings?.length || 0); i += 8)
    pages.push({ kind: "warnings", offset: i });
  if (config.sections.includes("table"))
    for (let i = 0; i < data.length; i += 28)
      pages.push({ kind: "table", offset: i });
  return pages;
}
export function reportTimeline(data: Detection[], from: string, to: string) {
  const days = byDay(data, from, to);
  if (days.length <= 62) return { title: "Focos por día", values: days };
  const yearly = days.length > 730;
  const counts = new Map<string, number>();
  for (const day of days) {
    const key = day.name.slice(0, yearly ? 4 : 7);
    counts.set(key, (counts.get(key) || 0) + day.count);
  }
  return {
    title: yearly ? "Focos por año" : "Focos por mes",
    values: [...counts].map(([label, count]) => ({
      name: yearly ? `${label}-01-01` : `${label}-01`,
      label,
      count,
    })),
  };
}
export function maxFrp(data: Detection[]) {
  return data.reduce((max, d) => Math.max(max, d.frp), 0);
}
export function reportQueryKey(c: ReportConfig) {
  return JSON.stringify([
    c.mode === "day" ? c.to : c.from,
    c.to,
    c.satellite,
    c.bbox,
    c.country || "",
    c.continent || "",
    c.areaType,
    c.areas,
    c.sourceFilters,
  ]);
}
