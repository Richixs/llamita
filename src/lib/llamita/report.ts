import { scopeLabel } from "@/lib/geo/scope";
import { reportPlan } from "./report-model";
import { filterDetections, type Detection } from "./data";
import { WORLD_BBOX, type Bbox } from "@/lib/geo/catalog";
import { initialFilters, periodError, type Filters } from "./filters";
export type ReportFormat = "PDF" | "Excel" | "CSV" | "Shapefile" | "GeoJSON";
export type ReportSection = "summary" | "map" | "daily" | "ranking" | "table";
export const sectionLabels: Record<ReportSection, string> = {
  summary: "Resumen con cifras clave",
  map: "Mapa de focos",
  daily: "Gráfico de focos por día",
  ranking: "Rankings por país y sensor",
  table: "Tabla con todas las detecciones",
};
export type AreaType =
  "all" | "province" | "municipality" | "territory" | "protectedArea";
export interface ReportConfig {
  origin: "live";
  bbox?: Bbox;
  country?: string;
  continent?: string;
  local?: boolean;
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
  sections: ["summary", "map", "daily", "ranking"],
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
  const bounded = config.bbox
    ? data.filter(
        (d) =>
          d.longitude >= config.bbox![0] &&
          d.longitude <= config.bbox![2] &&
          d.latitude >= config.bbox![1] &&
          d.latitude <= config.bbox![3],
      )
    : data;
  if (config.areaType === "all") return bounded;
  const key = config.areaType;
  return bounded.filter((d) => config.areas.includes(d[key]));
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
  return reportPlan(config, data).length;
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
    local: filters.local,
    sourceFilters: undefined,
    sections: ["summary", "map", "daily", "ranking"],
  };
}
export function storeReports(reports: SavedReport[]) {
  localStorage.setItem(
    REPORT_STORAGE_KEY,
    JSON.stringify(reports.slice(0, 20)),
  );
}

export function reportFilename(config: ReportConfig, extension: string) {
  const scope = scopeLabel(config)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const from = config.mode === "day" ? config.to : config.from;
  return `llamita-${scope}-${from}${from === config.to ? "" : `_${config.to}`}.${extension}`;
}
