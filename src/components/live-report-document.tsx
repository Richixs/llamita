"use client";
import { scopeLabel } from "@/lib/geo/scope";
import Image from "next/image";
import { DailyChart, RankingChart } from "./charts";
import type { Detection } from "@/lib/llamita/data";
import { dateLabel, number, periodLabel } from "@/lib/llamita/filters";
import { ReportMap } from "./report-map";
import { WORLD_BBOX } from "@/lib/geo/catalog";
import type { ReportConfig } from "@/lib/llamita/report";
import {
  reportPlan,
  reportRankings,
  reportTimeline,
  maxFrp,
} from "@/lib/llamita/report-model";
export function LiveReportDocument({
  config,
  data,
  preview = false,
  previewPage = 0,
  generatedAt,
}: {
  config: ReportConfig;
  data: Detection[];
  preview?: boolean;
  previewPage?: number;
  generatedAt: string;
}) {
  const bbox = config.bbox || WORLD_BBOX,
    plan = reportPlan(config, data),
    ranks = reportRankings(data);
  const timeline = reportTimeline(
    data,
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  const include = (section: ReportConfig["sections"][number]) =>
    config.sections.includes(section);
  return (
    <div className={`report-document ${preview ? "is-preview" : ""}`}>
      {plan.map(
        (page, index) =>
          (!preview || index === Math.min(previewPage, plan.length - 1)) && (
            <article
              className="pdf-page"
              data-pdf-page
              key={`${page.kind}-${page.offset}`}
            >
              <header className="pdf-header">
                <Image
                  src="/brand/llamita-logo-para-fondo-claro.svg"
                  alt="llamita"
                  width={90}
                  height={36}
                />
                <div>
                  <p className="overline">Reporte de focos de calor</p>
                  <p>Generado el {generatedAt}</p>
                </div>
              </header>
              {page.kind === "overview" && (
                <>
                  <h1>Focos de calor · {scopeLabel(config)}</h1>
                  <p className="pdf-subtitle">
                    {periodLabel(config)} · NASA FIRMS
                  </p>
                  <p className="text-caption muted">
                    Área consultada: {bbox.join(", ")}
                  </p>
                  {include("summary") && (
                    <div className="pdf-metrics">
                      {[
                        { label: "Detecciones", value: number(data.length) },
                        {
                          label: "Países",
                          value: number(
                            ranks.countries.filter(
                              (c) => c.name !== "Sin asignar",
                            ).length,
                          ),
                        },
                        {
                          label: "VIIRS / MODIS",
                          value: `${number(data.filter((d) => d.satellite === "VIIRS").length)} / ${number(data.filter((d) => d.satellite === "MODIS").length)}`,
                        },
                        {
                          label: "FRP máximo",
                          value: `${maxFrp(data).toFixed(1)} MW`,
                        },
                      ].map((m) => (
                        <section key={m.label}>
                          <p className="overline">{m.label}</p>
                          <p className="pdf-metric-value">{m.value}</p>
                        </section>
                      ))}
                    </div>
                  )}
                  {include("map") && (
                    <section className="pdf-map-section">
                      <h4>Distribución geográfica</h4>
                      <ReportMap data={data} bbox={bbox} />
                      <p className="text-caption muted">
                        Coordenadas reales · Web Mercator
                      </p>
                    </section>
                  )}
                  {include("daily") && (
                    <section className="pdf-live-daily">
                      <h4>{timeline.title}</h4>
                      <DailyChart values={timeline.values} compact />
                    </section>
                  )}
                  <p className="pdf-live-disclosure">
                    Detecciones agrupadas por día y cuadrícula aproximada de 1
                    km. VIIRS es el sensor representativo cuando coincide con
                    MODIS. Un foco no equivale necesariamente a un incendio
                    independiente.
                  </p>
                </>
              )}
              {page.kind === "ranking" && (
                <>
                  <h1>Rankings del periodo</h1>
                  <p className="pdf-subtitle">
                    {periodLabel(config)} · {number(data.length)} detecciones
                  </p>
                  <h4>Países con más focos · top 15</h4>
                  <RankingChart
                    values={ranks.countries.slice(0, 15)}
                    highlight
                  />
                  <h4>Por sensor representativo</h4>
                  <RankingChart values={ranks.sensors} highlight />
                  <p className="text-caption muted">
                    Países asignados con límites generalizados de Natural Earth.
                    «Sin asignar» incluye puntos fuera de sus polígonos. Los
                    valores corresponden al área y periodo consultados.
                  </p>
                </>
              )}
              {page.kind === "local-ranking" && (
                <>
                  <h1>Rankings del reto local</h1>
                  <p className="pdf-subtitle">
                    Cochabamba · {periodLabel(config)}
                  </p>
                  <div className="pdf-charts">
                    <section>
                      <h4>Municipios · top 15</h4>
                      <RankingChart
                        values={ranks.municipalities.slice(0, 15)}
                        highlight
                      />
                    </section>
                    <section>
                      <h4>Provincias · top 15</h4>
                      <RankingChart
                        values={ranks.provinces.slice(0, 15)}
                        highlight
                      />
                    </section>
                  </div>
                  <p className="text-caption muted">
                    Detalle disponible únicamente dentro de los límites de
                    Cochabamba. Los puntos sin asignación local no se incluyen
                    en estos rankings.
                  </p>
                </>
              )}
              {page.kind === "warnings" && (
                <>
                  <h1>Disponibilidad de los datos</h1>
                  <p className="pdf-subtitle">{periodLabel(config)}</p>
                  <ul className="pdf-warning-list">
                    {config
                      .warnings!.slice(page.offset, page.offset + 8)
                      .map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                  </ul>
                </>
              )}
              {page.kind === "table" && (
                <>
                  <h1>Detecciones del periodo</h1>
                  <table className="pdf-table">
                    <thead>
                      <tr>
                        <th>Fecha · hora (UTC−4)</th>
                        <th>País</th>
                        <th>Sensor</th>
                        <th>FRP MW</th>
                        <th>Coordenadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(page.offset, page.offset + 28).map((d) => (
                        <tr key={d.id}>
                          <td>
                            {dateLabel(d.date)} · {d.time}
                          </td>
                          <td>{d.country || "Sin asignar"}</td>
                          <td>{d.satellite}</td>
                          <td>{d.frp}</td>
                          <td>
                            {d.latitude}, {d.longitude}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              <footer className="pdf-footer">
                <p>
                  Fuente: NASA FIRMS · VIIRS y MODIS. Países: Natural Earth.
                  Hora de Bolivia (UTC−4). Un foco debe verificarse en campo.
                </p>
                <span className="mono">
                  Página {index + 1} de {plan.length}
                </span>
              </footer>
            </article>
          ),
      )}
    </div>
  );
}
