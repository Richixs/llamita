"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DataModeControl } from "./data-mode-control";
import { LiveReportBuilder } from "./live-report-builder";
import { useApp } from "./app-provider";
import { Icon, type IconName } from "./icon";
import { ReportDocument } from "./report-document";
import {
  municipalities,
  provinces,
  territories,
  protectedAreas,
} from "@/lib/llamita/data";
import { dateOffset, number, periodError } from "@/lib/llamita/filters";
import {
  configFromFilters,
  storeReports,
  DRAFT_STORAGE_KEY,
  exampleReports,
  readSavedReports,
  REPORT_STORAGE_KEY,
  reportData,
  reportPages,
  sectionLabels,
  validateReport,
  type AreaType,
  type ReportConfig,
  type ReportFormat,
  type ReportSection,
  type SavedReport,
} from "@/lib/llamita/report";
import "./statistics.css";
import "./reports.css";
const formats: { name: ReportFormat; icon: IconName; description: string }[] = [
  { name: "PDF", icon: "file", description: "Para leer e imprimir" },
  { name: "Excel", icon: "chart", description: "Tablas editables" },
  { name: "CSV", icon: "chart", description: "Datos sin formato" },
  { name: "Shapefile", icon: "map", description: "Para QGIS / ArcGIS" },
  { name: "GeoJSON", icon: "map", description: "Para la web" },
];
export function ReportBuilder() {
  const { mode } = useApp();
  return mode === "live" ? <LiveReportBuilder /> : <DemoReportBuilder />;
}
function DemoReportBuilder() {
  const { filters } = useApp();
  const [config, setConfig] = useState<ReportConfig>(() =>
    configFromFilters(filters),
  );
  const [areaOpen, setAreaOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageNote, setStorageNote] = useState("");
  const activeJobs = useRef(new Set<string>());
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(REPORT_STORAGE_KEY);
        setReports(
          raw
            ? readSavedReports(raw).filter((r) => r.config.origin !== "live")
            : exampleReports(),
        );
      } catch {
        setReports(exampleReports());
        setStorageNote(
          "El navegador no permite guardar el historial. Las descargas siguen disponibles.",
        );
      }
    };
    load();
  }, []);
  const update = (patch: Partial<ReportConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setError("");
  };
  const data = reportData(config);
  const count = new Set(data.map((d) => d.municipality)).size;
  const options =
    config.areaType === "province"
      ? provinces
      : config.areaType === "municipality"
        ? municipalities.map((m) => m.name).sort()
        : config.areaType === "territory"
          ? territories
          : protectedAreas;
  function persist(next: SavedReport[]) {
    setReports(next);
    try {
      storeReports(next, "demo");
    } catch {
      setStorageNote(
        "No hay espacio para guardar el historial. Puedes descargar el archivo igualmente.",
      );
    }
  }
  function saveDraft(c = config) {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(c));
    } catch {
      setStorageNote(
        "No se pudo guardar la vista previa. Puedes generar el archivo directamente.",
      );
    }
  }
  async function generate(c = config, existing?: SavedReport) {
    const validation = validateReport(c);
    if (validation) {
      setError(validation);
      return;
    }
    const id = existing?.id || crypto.randomUUID();
    if (activeJobs.current.has(id)) return;
    activeJobs.current.add(id);
    setBusy(true);
    setError("");
    const report: SavedReport = {
      id,
      name:
        existing?.name ||
        `${c.areaType === "all" ? "Todo Cochabamba" : c.areas.join(", ")} · ${c.from} – ${c.to}`,
      createdAt: new Date().toISOString(),
      config: structuredClone(c),
      status: "generating",
    };
    const next = [report, ...reports.filter((r) => r.id !== id)].slice(0, 20);
    persist(next);
    try {
      const { exportReport } = await import("@/lib/llamita/export-report");
      const blob = await exportReport(c, reportData(c));
      const { saveBlob } = await import("@/lib/llamita/downloads");
      const ext = {
        PDF: "pdf",
        Excel: "xlsx",
        CSV: "csv",
        Shapefile: "zip",
        GeoJSON: "geojson",
      }[c.format];
      saveBlob(blob, `llamita-${c.to}-ejemplo.${ext}`);
      persist(
        next.map((r) =>
          r.id === id ? { ...r, status: "ready", size: blob.size } : r,
        ),
      );
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "No se pudo generar. Intenta nuevamente.";
      persist(
        next.map((r) =>
          r.id === id ? { ...r, status: "error", error: message } : r,
        ),
      );
      setError(message);
    } finally {
      activeJobs.current.delete(id);
      setBusy(false);
    }
  }
  const pageError = periodError(
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  const areaTypes: [AreaType, string][] = [
    ["all", "Todo Cochabamba"],
    ["province", "Por provincia"],
    ["municipality", "Por municipio"],
    ["territory", "Por TCO"],
    ["protectedArea", "Por área protegida"],
  ];
  return (
    <main id="contenido" className="page reports-page">
      <DataModeControl />
      <div className="page-heading">
        <div>
          <h1>Generar reporte</h1>
          <p>
            Genera un reporte con los mismos datos del mapa y descárgalo en el
            formato que necesites.
          </p>
        </div>
      </div>
      <div className="report-columns">
        <section className="panel report-form">
          <h3>Nuevo reporte</h3>
          <p className="muted text-body-sm">
            Completa los 4 pasos. Puedes volver a cualquier paso antes de
            generar.
          </p>
          {(config.sourceFilters?.territory ||
            config.sourceFilters?.protectedArea) && (
            <p className="notice">
              Filtros del mapa:{" "}
              {[
                config.sourceFilters.territory,
                config.sourceFilters.protectedArea,
              ]
                .filter(Boolean)
                .join(" · ")}{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => update({ sourceFilters: undefined })}
              >
                Quitar filtros adicionales
              </button>
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <fieldset className="report-step">
              <legend>
                <span>1</span>Área
              </legend>
              <div className="step-content">
                <p>¿De qué parte de Cochabamba?</p>
                <div className="row wrap area-types">
                  {areaTypes.map(([type, label]) => (
                    <button
                      type="button"
                      key={type}
                      className="pill"
                      aria-pressed={config.areaType === type}
                      onClick={() => {
                        update({
                          areaType: type,
                          areas: [],
                          sourceFilters: undefined,
                        });
                        setAreaOpen(false);
                        setQuery("");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {config.areaType !== "all" && (
                  <div
                    className="area-selector"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget))
                        setAreaOpen(false);
                    }}
                  >
                    <div className="area-chips">
                      {config.areas.map((a) => (
                        <span className="selected-area" key={a}>
                          {a}
                          <button
                            type="button"
                            aria-label={`Quitar ${a}`}
                            onClick={() =>
                              update({
                                areas: config.areas.filter((v) => v !== a),
                              })
                            }
                          >
                            <Icon name="close" />
                          </button>
                        </span>
                      ))}
                      <button
                        className="icon-btn"
                        type="button"
                        aria-label="Seleccionar lugares"
                        aria-expanded={areaOpen}
                        aria-controls="report-areas"
                        onClick={() => setAreaOpen(!areaOpen)}
                      >
                        <Icon name="chevron" />
                      </button>
                    </div>
                    {areaOpen && (
                      <div className="area-options" id="report-areas">
                        <input
                          className="input"
                          aria-label="Buscar lugar para el reporte"
                          placeholder="Buscar lugar"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setAreaOpen(false);
                          }}
                          autoFocus
                        />
                        {options
                          .filter((o) =>
                            o
                              .toLocaleLowerCase()
                              .includes(query.toLocaleLowerCase()),
                          )
                          .map((o) => (
                            <label key={o}>
                              <input
                                type="checkbox"
                                checked={config.areas.includes(o)}
                                onChange={(e) =>
                                  update({
                                    areas: e.target.checked
                                      ? [...config.areas, o]
                                      : config.areas.filter((a) => a !== o),
                                  })
                                }
                              />
                              {o}
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </fieldset>
            <fieldset className="report-step">
              <legend>
                <span>2</span>Periodo
              </legend>
              <div className="step-content">
                <p>Un día o un rango de hasta 366 días.</p>
                <div className="segmented report-mode">
                  <button
                    type="button"
                    aria-pressed={config.mode === "day"}
                    onClick={() => update({ mode: "day" })}
                  >
                    Un día
                  </button>
                  <button
                    type="button"
                    aria-pressed={config.mode === "range"}
                    onClick={() => update({ mode: "range" })}
                  >
                    Rango
                  </button>
                </div>
                <div className="dates-row">
                  {config.mode === "range" && (
                    <label className="field">
                      Desde
                      <input
                        type="date"
                        value={config.from}
                        max={config.to}
                        required
                        onChange={(e) => update({ from: e.target.value })}
                      />
                    </label>
                  )}
                  <label className="field">
                    {config.mode === "day" ? "Día" : "Hasta"}
                    <input
                      type="date"
                      value={config.to}
                      min={config.mode === "range" ? config.from : undefined}
                      required
                      onChange={(e) => update({ to: e.target.value })}
                    />
                  </label>
                </div>
                {pageError && (
                  <p className="form-error text-caption">{pageError}</p>
                )}
                <div className="row wrap report-shortcuts">
                  {[
                    ["Últimos 7 días", 7],
                    ["Últimos 30 días", 30],
                    ["Temporada seca 2026", 0],
                  ].map(([label, days]) => (
                    <button
                      type="button"
                      className="pill"
                      key={label}
                      onClick={() =>
                        update({
                          mode: "range",
                          from: days
                            ? dateOffset("2026-11-14", 1 - Number(days))
                            : "2026-05-01",
                          to: "2026-11-14",
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
            <fieldset className="report-step">
              <legend>
                <span>3</span>Contenido
              </legend>
              <div className="step-content">
                <p>Elige qué secciones incluir.</p>
                <div className="section-checkboxes">
                  {(
                    Object.entries(sectionLabels) as [ReportSection, string][]
                  ).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={config.sections.includes(key)}
                        onChange={(e) =>
                          update({
                            sections: e.target.checked
                              ? [...config.sections, key]
                              : config.sections.filter((s) => s !== key),
                          })
                        }
                      />
                      {label}
                      {key === "table" && (
                        <span className="mono muted">
                          {number(data.length)} filas
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {config.format !== "PDF" && (
                  <p className="text-caption muted">
                    Las secciones se aplican al PDF. Los formatos de datos
                    incluyen todas las detecciones seleccionadas.
                  </p>
                )}
              </div>
            </fieldset>
            <fieldset className="report-step">
              <legend>
                <span>4</span>Formato
              </legend>
              <div className="step-content">
                <div
                  className="format-options"
                  role="group"
                  aria-label="Formato del reporte"
                >
                  {formats.map((f) => (
                    <button
                      type="button"
                      key={f.name}
                      aria-pressed={config.format === f.name}
                      onClick={() => update({ format: f.name })}
                    >
                      <span className="row">
                        <Icon name={f.icon} />
                        {config.format === f.name && <Icon name="check" />}
                      </span>
                      <strong>{f.name}</strong>
                      <span>{f.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
            <div className="report-submit">
              <div>
                <strong>
                  Incluirá {number(data.length)} focos de {count} municipios
                </strong>
                <p className="muted text-caption">
                  Datos de ejemplo · el archivo se genera en tu navegador.
                </p>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={busy || !!pageError}
              >
                <Icon name="file" />
                {busy ? "Generando…" : "Generar reporte"}
              </button>
            </div>
            {error && (
              <p role="alert" className="notice error-notice">
                {error}
              </p>
            )}
          </form>
        </section>
        <aside className="report-sidebar">
          <section className="panel">
            <div className="row preview-heading">
              <div>
                <h3>Vista previa</h3>
                <p className="muted text-body-sm">
                  Se actualiza al cambiar los pasos
                </p>
              </div>
              <Link
                href="/reportes/pdf"
                className="icon-btn"
                aria-label="Abrir vista previa del PDF"
                onClick={() => saveDraft()}
              >
                <Icon name="expand" />
              </Link>
            </div>
            <div className="report-preview">
              <div className="preview-sheet">
                <ReportDocument config={config} data={data} preview />
              </div>
            </div>
            <p className="muted text-caption preview-caption">
              Página 1 de {reportPages(config, data)} · PDF tamaño A4
            </p>
          </section>
          <section className="panel recent-reports">
            <h3>Reportes recientes</h3>
            <p className="muted text-body-sm">
              Se guardan 30 días en este navegador
            </p>
            {storageNote && (
              <p className="text-caption muted" role="status">
                {storageNote}
              </p>
            )}
            <div aria-live="polite">
              {reports.map((r) => (
                <article className="recent-report" key={r.id}>
                  <div className="recent-report-main">
                    <span className="report-file">
                      <Icon name="file" />
                    </span>
                    <div className="recent-report-title">
                      <strong>{r.name}</strong>
                      <p className="muted text-caption">
                        {r.config.format} ·{" "}
                        {r.size ? `${(r.size / 1024).toFixed(0)} KB · ` : ""}
                        {r.id.startsWith("example")
                          ? "Ejemplo"
                          : new Date(r.createdAt).toLocaleDateString("es-BO", {
                              timeZone: "America/La_Paz",
                            })}
                      </p>
                    </div>
                    <span
                      className={`badge ${r.status === "generating" ? "pending" : r.status === "error" ? "error" : ""}`}
                    >
                      {r.status === "ready"
                        ? "Listo"
                        : r.status === "generating"
                          ? "Generando"
                          : "Error"}
                    </span>
                    {r.status === "ready" && (
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => void generate(r.config, r)}
                      >
                        <Icon name="download" />
                        Descargar
                      </button>
                    )}
                  </div>
                  {r.status === "generating" && (
                    <progress aria-label={`Generando ${r.name}`} />
                  )}
                  {r.status === "error" && (
                    <div className="recent-error">
                      <p>{r.error}</p>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => void generate(r.config, r)}
                      >
                        <Icon name="refresh" />
                        Reintentar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
