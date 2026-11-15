"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GeographicScopeControl } from "./geographic-scope-control";
import { scopeLabel } from "@/lib/geo/scope";
import { useApp } from "./app-provider";
import { useLiveDetections, fetchLiveDetections } from "./use-live-detections";
import { ReportFormatPreview } from "./report-format-preview";
import { reportQueryKey } from "@/lib/llamita/report-model";
import { Icon, type IconName } from "./icon";
import { dateLabel, number } from "@/lib/llamita/filters";
import { WORLD_BBOX } from "@/lib/geo/catalog";
import {
  DRAFT_STORAGE_KEY,
  REPORT_STORAGE_KEY,
  liveConfig,
  readSavedReports,
  reportData,
  sectionLabels,
  storeReports,
  validateReport,
  reportFilename,
  type ReportConfig,
  type ReportFormat,
  type ReportSection,
  type SavedReport,
} from "@/lib/llamita/report";
const FORMATS: [ReportFormat, IconName, string][] = [
  ["PDF", "file", "Para leer e imprimir"],
  ["Excel", "chart", "Tablas editables"],
  ["CSV", "chart", "Datos sin formato"],
  ["Shapefile", "map", "Para QGIS / ArcGIS"],
  ["GeoJSON", "map", "Para la web"],
];
export function LiveReportBuilder() {
  const { filters, bbox, today } = useApp();
  const [config, setConfig] = useState(() => liveConfig(filters, bbox));
  const [queryConfig, setQueryConfig] = useState(config);
  const [generationProgress, setGenerationProgress] = useState({
    completed: 0,
    total: 0,
  });
  const generation = useRef<AbortController | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageNote, setStorageNote] = useState("");
  const live = useLiveDetections({
    from: queryConfig.mode === "day" ? queryConfig.to : queryConfig.from,
    to: queryConfig.to,
    sensor: queryConfig.satellite,
    bbox: queryConfig.bbox || WORLD_BBOX,
    country: queryConfig.country,
    continent: queryConfig.continent,
  });
  const current = reportQueryKey(config) === reportQueryKey(queryConfig);
  const data = reportData(config, live.data);
  useEffect(() => () => generation.current?.abort(), []);
  useEffect(() => {
    function load() {
      try {
        setReports(
          readSavedReports(localStorage.getItem(REPORT_STORAGE_KEY)).filter(
            (r) => r.config.origin === "live",
          ),
        );
      } catch {
        setStorageNote("No se puede guardar el historial en este navegador.");
      }
    }
    load();
  }, []);
  const update = (patch: Partial<ReportConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setError("");
  };
  function persist(next: SavedReport[]) {
    setReports(next);
    try {
      storeReports(next);
    } catch {
      setStorageNote(
        "No se pudo guardar el historial. La descarga sigue disponible.",
      );
    }
  }
  async function generate(c = config, previous?: SavedReport) {
    if (busy) return;
    const controller = new AbortController();
    generation.current = controller;
    setGenerationProgress({ completed: 0, total: 0 });
    setBusy(true);
    setError("");
    const id = previous?.id || crypto.randomUUID();
    const entry: SavedReport = {
      id,
      createdAt: new Date().toISOString(),
      name: `${scopeLabel(c)} · ${c.mode === "day" ? c.to : `${c.from} – ${c.to}`}`,
      config: { ...c, origin: "live" },
      status: "generating",
    };
    const next = [entry, ...reports.filter((r) => r.id !== id)].slice(0, 20);
    persist(next);
    try {
      const result =
        reportQueryKey(c) === reportQueryKey(queryConfig) &&
        !live.loading &&
        !live.error &&
        !live.cancelled
          ? { data: live.data, warnings: live.warnings }
          : await fetchLiveDetections(
              c.mode === "day" ? c.to : c.from,
              c.to,
              c.satellite,
              c.bbox || WORLD_BBOX,
              controller.signal,
              {
                country: c.country,
                continent: c.continent,
                onProgress: setGenerationProgress,
              },
            );
      controller.signal.throwIfAborted();
      const exportData = reportData(c, result.data);
      const validation = validateReport(c, exportData);
      if (validation) throw new Error(validation);
      const snapshot = {
        ...c,
        origin: "live" as const,
        warnings: result.warnings,
      };
      const { exportReport } = await import("@/lib/llamita/export-report");
      const blob = await exportReport(snapshot, exportData);
      controller.signal.throwIfAborted();
      const { saveBlob } = await import("@/lib/llamita/downloads");
      const ext = {
        PDF: "pdf",
        Excel: "xlsx",
        CSV: "csv",
        Shapefile: "zip",
        GeoJSON: "geojson",
      }[c.format];
      saveBlob(blob, reportFilename(c, ext));
      persist(
        next.map((r) =>
          r.id === id
            ? { ...r, status: "ready", size: blob.size, config: snapshot }
            : r,
        ),
      );
    } catch (e) {
      const message = controller.signal.aborted
        ? "Generación cancelada."
        : e instanceof Error
          ? e.message
          : "No se pudo generar el reporte.";
      setError(message);
      persist(
        next.map((r) =>
          r.id === id ? { ...r, status: "error", error: message } : r,
        ),
      );
    } finally {
      generation.current = null;
      setBusy(false);
    }
  }
  function saveDraft() {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ ...config, warnings: live.warnings }),
      );
    } catch {
      setStorageNote("No se pudo guardar la vista previa.");
    }
  }
  return (
    <main id="contenido" className="page reports-page">
      <div className="page-heading">
        <div>
          <h1>Generar reporte</h1>
          <p>
            Descarga las detecciones reales de NASA FIRMS del área y periodo
            elegidos.
          </p>
        </div>
      </div>
      <div className="report-columns">
        <section className="panel report-form">
          <h3>Nuevo reporte</h3>
          <p className="muted text-body-sm">
            Datos mundiales de FIRMS, con países asignados a partir de Natural
            Earth y detalle municipal para el reto local.
          </p>
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
                <GeographicScopeControl
                  continent={config.continent}
                  country={config.country}
                  local={config.local}
                  onChange={({ continent, country, bbox, local }) =>
                    update({
                      continent,
                      country,
                      local,
                      bbox,
                      areaType: "all",
                      areas: [],
                    })
                  }
                />
                <p>{scopeLabel(config)} · área seleccionada en el mapa:</p>
                <p className="mono text-caption">
                  {(config.bbox || WORLD_BBOX).join(", ")}
                </p>
                <Link href="/" className="text-link">
                  Cambiar el área en el mapa
                </Link>
                <p>
                  La consulta respeta el continente y país elegidos. Si
                  seleccionaste un municipio o provincia del reto local, se
                  mantiene ese filtro.
                </p>
              </div>
            </fieldset>
            <fieldset className="report-step">
              <legend>
                <span>2</span>Periodo
              </legend>
              <div className="step-content">
                <p>
                  Histórico desde 2000 hasta {today.slice(0, 4)} · hora de
                  Bolivia (UTC−4).
                </p>
                <label className="field">
                  Año
                  <select
                    aria-label="Año del histórico"
                    value={
                      config.mode === "range" &&
                      config.from.endsWith("-01-01") &&
                      config.to ===
                        [`${config.from.slice(0, 4)}-12-31`, today].sort()[0]
                        ? config.from.slice(0, 4)
                        : ""
                    }
                    onChange={(e) => {
                      if (!e.target.value) return;
                      update({
                        mode: "range",
                        from: `${e.target.value}-01-01`,
                        to: [`${e.target.value}-12-31`, today].sort()[0],
                      });
                    }}
                  >
                    <option value="">Periodo personalizado</option>
                    {Array.from(
                      { length: Number(today.slice(0, 4)) - 1999 },
                      (_, i) => String(2000 + i),
                    )
                      .reverse()
                      .map((year) => (
                        <option key={year}>{year}</option>
                      ))}
                  </select>
                </label>
                <button
                  className="text-link"
                  type="button"
                  onClick={() =>
                    update({ mode: "range", from: "2000-01-01", to: today })
                  }
                >
                  Todo el histórico · 2000–{today.slice(0, 4)}
                </button>
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
                        min="2000-01-01"
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
                      min={config.mode === "range" ? config.from : "2000-01-01"}
                      max={today}
                      required
                      onChange={(e) => update({ to: e.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  Sensor
                  <select
                    value={config.satellite}
                    onChange={(e) =>
                      update({
                        satellite: e.target.value as ReportConfig["satellite"],
                      })
                    }
                  >
                    <option value="all">VIIRS y MODIS</option>
                    <option value="VIIRS">VIIRS</option>
                    <option value="MODIS">MODIS</option>
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset className="report-step">
              <legend>
                <span>3</span>Contenido
              </legend>
              <div className="step-content">
                <p>
                  Secciones del PDF. Los otros formatos incluyen todas las
                  detecciones.
                </p>
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
                    </label>
                  ))}
                </div>
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
                  {FORMATS.map(([name, icon, description]) => (
                    <button
                      type="button"
                      key={name}
                      aria-pressed={config.format === name}
                      onClick={() => update({ format: name })}
                    >
                      <span className="row">
                        <Icon name={icon} />
                        {config.format === name && <Icon name="check" />}
                      </span>
                      <strong>{name}</strong>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
            <div className="preview-actions">
              <button
                type="button"
                className="btn"
                disabled={live.loading && current}
                onClick={() => {
                  setQueryConfig(config);
                  live.reload();
                }}
              >
                <Icon name="refresh" />
                Actualizar vista previa
              </button>
              {live.loading && (
                <button type="button" className="btn" onClick={live.cancel}>
                  Cancelar consulta
                </button>
              )}
            </div>
            {!current && (
              <p className="notice" role="status">
                El periodo o área cambió. Actualiza la vista previa para
                consultar estos datos.
              </p>
            )}
            {live.cancelled && (
              <p className="notice" role="status">
                Consulta cancelada. Puedes volver a actualizar la vista previa.
              </p>
            )}
            {live.loading && (
              <p className="notice" role="status">
                Consultando datos para la vista previa… Bloque{" "}
                {live.progress.completed} de {live.progress.total}
              </p>
            )}
            {live.error && (
              <p className="notice error-notice" role="alert">
                {live.error}
              </p>
            )}
            {live.warnings.length > 0 && (
              <details className="notice">
                <summary>Disponibilidad del periodo</summary>
                {live.warnings.map((w) => (
                  <p className="text-caption" key={w}>
                    {w}
                  </p>
                ))}
              </details>
            )}
            <div className="report-submit">
              <div>
                <strong>
                  {live.loading
                    ? "Consultando…"
                    : `${number(current ? data.length : 0)} detecciones reales`}
                </strong>
                <p className="muted text-caption">NASA FIRMS · VIIRS y MODIS</p>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={
                  busy ||
                  live.loading ||
                  !!live.error ||
                  live.cancelled ||
                  !current ||
                  !data.length
                }
              >
                <Icon name="file" />
                {busy ? "Generando…" : "Generar reporte"}
              </button>
            </div>
            {busy && (
              <p className="notice" role="status">
                Generando reporte…{" "}
                {generationProgress.total > 0 &&
                  `Bloque ${generationProgress.completed} de ${generationProgress.total}`}{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => generation.current?.abort()}
                >
                  Cancelar generación
                </button>
              </p>
            )}
            {error && (
              <p className="notice error-notice" role="alert">
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
                  {config.format} · datos del área y periodo seleccionados
                </p>
              </div>
              {config.format === "PDF" &&
                current &&
                !live.loading &&
                !live.error &&
                !live.cancelled &&
                data.length > 0 && (
                  <Link
                    href="/reportes/pdf"
                    className="icon-btn"
                    aria-label="Abrir vista previa completa del PDF"
                    onClick={saveDraft}
                  >
                    <Icon name="expand" />
                  </Link>
                )}
            </div>
            {current &&
            !live.loading &&
            !live.error &&
            !live.cancelled &&
            data.length > 0 ? (
              <ReportFormatPreview
                config={{ ...config, warnings: live.warnings }}
                data={data}
                generatedAt={dateLabel(today)}
              />
            ) : (
              <p className="notice">
                {live.loading
                  ? "Consultando datos…"
                  : "Actualiza la consulta para previsualizar este formato con sus detecciones."}
              </p>
            )}
          </section>
          <section className="panel recent-reports">
            <h3>Reportes recientes</h3>
            <p className="muted text-body-sm">
              Datos reales · guardados 30 días en este navegador
            </p>
            {storageNote && (
              <p className="text-caption muted" role="status">
                {storageNote}
              </p>
            )}
            <div aria-live="polite">
              {!reports.length && (
                <p className="muted text-body-sm">
                  Aún no has generado reportes con datos reales.
                </p>
              )}
              {reports.map((r) => (
                <article className="recent-report" key={r.id}>
                  <div className="recent-report-main">
                    <span className="report-file">
                      <Icon name="file" />
                    </span>
                    <div className="recent-report-title">
                      <strong>{r.name}</strong>
                      <p className="muted text-caption">
                        {r.config.format} · NASA FIRMS
                        {r.size ? ` · ${Math.round(r.size / 1024)} KB` : ""}
                      </p>
                    </div>
                    <span
                      className={`badge ${r.status === "error" ? "error" : r.status === "generating" ? "pending" : ""}`}
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
                    <progress aria-label="Generando reporte" />
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
