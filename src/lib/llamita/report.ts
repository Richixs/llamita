import { filterDetections, type Detection } from "./data";
import { WORLD_BBOX, type Bbox } from "@/lib/geo/catalog";
import { initialFilters, periodError, type Filters } from "./filters";
export type ReportFormat = "PDF" | "Excel" | "CSV" | "Shapefile" | "GeoJSON";
export type ReportSection =
  "summary" | "map" | "daily" | "ranking" | "protected" | "table";
export const sectionLabels: Record<ReportSection, string> = {
  summary: "Resumen con cifras clave",
  map: "Mapa de focos",
  daily: "Gráfico de focos por día",
  ranking: "Rankings por país y sensor",
  protected: "Focos en áreas protegidas",
  table: "Tabla con todas las detecciones",
};
export type AreaType =
  "all" | "province" | "municipality" | "territory" | "protectedArea";
export interface ReportConfig {
  origin: "live";
  bbox?: Bbox;
  country?: string;
  continent?: string;
  warnings?: string[];
  areaType: AreaType;
  areas: string[];
  mode: "day" | "range";
  from: string;
  to: string;
  sections: ReportSection[];
  format: ReportFormat;
  satellite: Filters["satellite"];
  sourceFilters?: Pick<Filters, "territory" | "protectedArea">;
}
export interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
  status: "ready" | "generating" | "error";
  config: ReportConfig;
  error?: string;
  size?: number;
}
export const defaultReport: ReportConfig = {
  origin: "live",
  areaType: "all",
  areas: [],
  mode: "range",
  from: "",
  to: "",
  sections: ["summary", "map", "daily", "ranking", "protected"],
  format: "PDF",
  satellite: "all",
};
export function reportData(
  config: ReportConfig,
  source: Detection[],
): Detection[] {
  const data = filterDetections(
    {
      ...initialFilters,
      ...config.sourceFilters,
      country: config.country,
      continent: config.continent,
      mode: config.mode,
      from: config.from,
      to: config.to,
      satellite: config.satellite,
    },
    source,
  );
  if (config.areaType === "all") return data;
  const key = config.areaType;
  return data.filter((d) => config.areas.includes(d[key]));
}
export function validateReport(config: ReportConfig, source: Detection[]) {
  const error = periodError(
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  if (error) return error;
  if (config.areaType !== "all" && !config.areas.length)
    return "Selecciona al menos un lugar para el reporte.";
  if (config.format === "PDF" && !config.sections.length)
    return "Selecciona al menos una sección para el PDF.";
  if (!reportData(config, source).length)
    return "No hay detecciones para el área y periodo elegidos.";
  return "";
}
export function configFromFilters(filters: Filters): ReportConfig {
  const type = filters.municipality
    ? "municipality"
    : filters.province
      ? "province"
      : filters.territory
        ? "territory"
        : filters.protectedArea
          ? "protectedArea"
          : "all";
  return {
    ...defaultReport,
    areaType: type,
    areas: type === "all" ? [] : [filters[type as Exclude<AreaType, "all">]],
    mode: filters.mode,
    from: filters.from,
    to: filters.to,
    satellite: filters.satellite,
    sourceFilters: {
      territory: type === "territory" ? "" : filters.territory,
      protectedArea: type === "protectedArea" ? "" : filters.protectedArea,
    },
  };
}
export function isReportConfig(value: unknown): value is ReportConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as ReportConfig;
  return (
    c.origin === "live" &&
    (!c.country ||
      (typeof c.country === "string" && /^[A-Z]{3}$/.test(c.country))) &&
    (!c.bbox ||
      (Array.isArray(c.bbox) &&
        c.bbox.length === 4 &&
        c.bbox.every(Number.isFinite) &&
        c.bbox[0] < c.bbox[2] &&
        c.bbox[1] < c.bbox[3] &&
        c.bbox.every((n) => Math.abs(n) <= 180))) &&
    (!c.warnings ||
      (Array.isArray(c.warnings) &&
        c.warnings.every((w) => typeof w === "string"))) &&
    ["all", "province", "municipality", "territory", "protectedArea"].includes(
      c.areaType,
    ) &&
    ["day", "range"].includes(c.mode) &&
    ["PDF", "Excel", "CSV", "Shapefile", "GeoJSON"].includes(c.format) &&
    ["all", "VIIRS", "MODIS"].includes(c.satellite) &&
    typeof c.from === "string" &&
    typeof c.to === "string" &&
    !periodError(c.from, c.to) &&
    Array.isArray(c.areas) &&
    c.areas.every((a) => typeof a === "string") &&
    Array.isArray(c.sections) &&
    c.sections.every((s) => Object.hasOwn(sectionLabels, s)) &&
    (!c.sourceFilters ||
      (typeof c.sourceFilters.territory === "string" &&
        typeof c.sourceFilters.protectedArea === "string"))
  );
}
export const REPORT_STORAGE_KEY = "llamita:reports:v1";
export const DRAFT_STORAGE_KEY = "llamita:report-draft:v1";
export function readSavedReports(raw: string | null): SavedReport[] {
  try {
    const data = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) return [];
    const cutoff = Date.now() - 30 * 86400000;
    return data
      .filter(
        (r: SavedReport) =>
          r &&
          typeof r.id === "string" &&
          typeof r.name === "string" &&
          isReportConfig(r.config) &&
          ["ready", "generating", "error"].includes(r.status) &&
          Date.parse(r.createdAt) > cutoff,
      )
      .slice(0, 20)
      .map((r: SavedReport) =>
        r.status === "generating"
          ? {
              ...r,
              status: "error",
              error:
                "La generación se interrumpió al cerrar la página. Puedes reintentarlo.",
            }
          : r,
      );
  } catch {
    return [];
  }
}
export function reportPages(config: ReportConfig, data: Detection[]) {
  return (
    1 +
    (config.origin === "live"
      ? Math.ceil((config.warnings?.length || 0) / 8)
      : 0) +
    (config.sections.includes("protected") ? 1 : 0) +
    (config.sections.includes("table") ? Math.ceil(data.length / 28) : 0)
  );
}

export function liveConfig(
  filters: Filters,
  bbox: Bbox = WORLD_BBOX,
): ReportConfig {
  return {
    ...configFromFilters(filters),
    origin: "live",
    bbox,
    country: filters.country,
    continent: filters.continent,
    sourceFilters: undefined,
    sections: ["summary", "map", "daily"],
  };
}
export function storeReports(reports: SavedReport[]) {
  localStorage.setItem(
    REPORT_STORAGE_KEY,
    JSON.stringify(reports.slice(0, 20)),
  );
}
