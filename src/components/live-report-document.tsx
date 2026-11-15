"use client";
import Image from "next/image";
import { DailyChart } from "./charts";
import { byDay, type Detection } from "@/lib/llamita/data";
import { dateLabel, number, periodLabel } from "@/lib/llamita/filters";
import { geographicSnapshot } from "@/lib/geo/snapshot";
import { GAMC_BBOX } from "@/lib/geo/catalog";
import { reportPages, type ReportConfig } from "@/lib/llamita/report";
export function LiveReportDocument({
  config,
  data,
  preview = false,
  generatedAt,
}: {
  config: ReportConfig;
  data: Detection[];
  preview?: boolean;
  generatedAt: string;
}) {
  const bbox = config.bbox || GAMC_BBOX,
    days = byDay(
      data,
      config.mode === "day" ? config.to : config.from,
      config.to,
    ),
    pages = reportPages(config, data);
  const include = (section: ReportConfig["sections"][number]) =>
    config.sections.includes(section);
  function header() {
    return (
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
    );
  }
  function footer(page: number) {
    return (
      <footer className="pdf-footer">
        <p>
          Fuente: NASA FIRMS · VIIRS y MODIS. Detecciones reales por rectángulo
          geográfico, sin asignación administrativa. Hora de Bolivia (UTC−4). Un
          foco debe verificarse en campo.
        </p>
        <span className="mono">
          Página {page} de {pages}
        </span>
      </footer>
    );
  }
  return (
    <div className={`report-document ${preview ? "is-preview" : ""}`}>
      <article className="pdf-page" data-pdf-page>
        {header()}
        <h1>Focos de calor en el área consultada</h1>
        <p className="pdf-subtitle">{periodLabel(config)} · NASA FIRMS</p>
        <p className="text-caption muted">
          BBOX (longitud, latitud): {bbox.join(", ")}
        </p>
        {include("summary") && (
          <div className="pdf-metrics">
            {[
              { label: "Detecciones", value: number(data.length) },
              {
                label: "VIIRS",
                value: number(
                  data.filter((d) => d.satellite === "VIIRS").length,
                ),
              },
              {
                label: "MODIS",
                value: number(
                  data.filter((d) => d.satellite === "MODIS").length,
                ),
              },
              {
                label: "FRP máximo",
                value: `${Math.max(0, ...data.map((d) => d.frp)).toFixed(1)} MW`,
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
            <Image
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(geographicSnapshot(data, bbox))}`}
              width={900}
              height={380}
              unoptimized
              alt="Detecciones reales por longitud y latitud en el rectángulo consultado"
              className="real-report-map"
            />
            <p className="text-caption muted">
              Coordenadas reales · proyección Web Mercator · sin polígonos
              administrativos.
            </p>
          </section>
        )}
        {include("daily") && (
          <section className="pdf-live-daily">
            <h4>Focos por día</h4>
            <DailyChart values={days} compact />
          </section>
        )}
        <p className="pdf-live-disclosure">
          Las observaciones de diferentes sensores pueden coincidir sobre un
          mismo incendio. Sin polígonos oficiales no se calculan totales por
          municipio, provincia, TCO ni área protegida.
        </p>
        {!!config.warnings?.length && (
          <p className="text-caption muted">
            El periodo tiene avisos de disponibilidad. Consulta las páginas
            siguientes antes de interpretar los totales.
          </p>
        )}
        {footer(1)}
      </article>
      {!preview &&
        Array.from(
          { length: Math.ceil((config.warnings?.length || 0) / 8) },
          (_, i) => (
            <article className="pdf-page" data-pdf-page key={`warnings-${i}`}>
              {header()}
              <h1>Disponibilidad de los datos</h1>
              <p className="pdf-subtitle">
                {periodLabel(config)} · consulta los productos y fechas
                disponibles antes de comparar totales.
              </p>
              <ul className="pdf-warning-list">
                {config.warnings!.slice(i * 8, (i + 1) * 8).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              {footer(i + 2)}
            </article>
          ),
        )}
      {!preview &&
        include("table") &&
        Array.from({ length: Math.ceil(data.length / 28) }, (_, i) => (
          <article className="pdf-page pdf-detail-page" key={i} data-pdf-page>
            {header()}
            <h3>Detecciones del periodo</h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Fecha · hora (UTC−4)</th>
                  <th>Sensor</th>
                  <th>FRP</th>
                  <th>Coordenadas</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(i * 28, (i + 1) * 28).map((d) => (
                  <tr key={d.id}>
                    <td>
                      {dateLabel(d.date)} · {d.time}
                    </td>
                    <td>{d.satellite}</td>
                    <td>{d.frp}</td>
                    <td>
                      {d.latitude}, {d.longitude}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {footer(i + 2 + Math.ceil((config.warnings?.length || 0) / 8))}
          </article>
        ))}
    </div>
  );
}
