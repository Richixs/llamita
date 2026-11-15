"use client";
import Image from "next/image";
import { byDay, ranking, type Detection } from "@/lib/llamita/data";
import { dateLabel, number, periodLabel } from "@/lib/llamita/filters";
import { reportPages, type ReportConfig } from "@/lib/llamita/report";
import { DailyChart, RankingChart } from "./charts";
import { MapArtwork } from "./map-artwork";
import "./report-document.css";
export function ReportDocument({
  config,
  data,
  generatedAt = "14 nov 2026, 15:10",
  preview = false,
}: {
  config: ReportConfig;
  data: Detection[];
  generatedAt?: string;
  preview?: boolean;
}) {
  const municipal = ranking(data, "municipality");
  const days = byDay(
    data,
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  const peak = days.toSorted((a, b) => b.count - a.count)[0];
  const protectedData = data.filter((d) => d.protectedArea);
  const include = (section: ReportConfig["sections"][number]) =>
    config.sections.includes(section);
  const title =
    config.areaType === "all"
      ? "Focos de calor en Cochabamba"
      : config.areaType === "municipality" && config.areas.length > 1
        ? "Focos de calor en el trópico de Cochabamba"
        : `Focos de calor en ${config.areas.join(", ")}`;
  const pages = reportPages(config, data);
  function footer(page: number) {
    return (
      <footer className="pdf-footer">
        <p>
          Fuente: NASA FIRMS — VIIRS 375 m y MODIS 1 km. Un foco de calor es una
          anomalía térmica detectada por satélite y debe verificarse en campo.
          Datos de ejemplo procesados por Llamita.
        </p>
        <span className="mono">
          Página {page} de {pages}
        </span>
      </footer>
    );
  }
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
  return (
    <div className={`report-document ${preview ? "is-preview" : ""}`}>
      <article className="pdf-page" data-pdf-page>
        {header()}
        <h1>{title}</h1>
        <p className="pdf-subtitle">
          {periodLabel(config)}
          {config.areaType !== "all"
            ? ` · ${config.areas.join(", ")}`
            : " · Todo Cochabamba"}
        </p>
        {include("summary") && (
          <div className="pdf-metrics">
            {[
              {
                label: "Focos",
                value: number(data.length),
                detail: "Datos de ejemplo",
              },
              {
                label: "Municipios",
                value: number(municipal.length),
                detail: "de 47 en Cochabamba",
              },
              {
                label: "Áreas protegidas",
                value: number(protectedData.length),
                detail: "PN Carrasco y TIPNIS",
              },
              {
                label: "Día pico",
                value: peak?.count
                  ? dateLabel(peak.name, { year: undefined })
                  : "—",
                detail: `${peak?.count || 0} focos`,
              },
            ].map((m) => (
              <section key={m.label}>
                <p className="overline">{m.label}</p>
                <p className="pdf-metric-value">{m.value}</p>
                <p>{m.detail}</p>
              </section>
            ))}
          </div>
        )}
        {include("map") && (
          <section className="pdf-map-section">
            <h4>Mapa de focos</h4>
            <div className="pdf-map">
              <MapArtwork
                data={data}
                selected={
                  config.areaType === "municipality" ? config.areas : []
                }
              />
            </div>
            <p className="pdf-heat-legend">
              FRP:{" "}
              {[
                ["< 5", 1],
                ["5–10", 2],
                ["10–25", 3],
                ["25–50", 4],
                ["> 50 MW", 5],
              ].map(([label, i]) => (
                <span key={label}>
                  <i className={`heat-dot heat-${i}`} />
                  {label}
                </span>
              ))}
            </p>
          </section>
        )}
        <div
          className={`pdf-charts ${!include("daily") || !include("ranking") ? "single" : ""}`}
        >
          {include("daily") && (
            <section>
              <h4>Focos por día</h4>
              <DailyChart values={days} compact />
            </section>
          )}
          {include("ranking") && (
            <section>
              <h4>Por municipio</h4>
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th>Municipio</th>
                    <th>Focos</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {municipal.slice(0, 5).map((m) => (
                    <tr key={m.name}>
                      <td>{m.name}</td>
                      <td>{number(m.count)}</td>
                      <td>
                        {(
                          (m.count / Math.max(data.length, 1)) *
                          100
                        ).toLocaleString("es-BO", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </td>
                    </tr>
                  ))}
                  {municipal.length > 5 && (
                    <tr>
                      <td>Otros municipios</td>
                      <td>
                        {number(
                          municipal.slice(5).reduce((s, m) => s + m.count, 0),
                        )}
                      </td>
                      <td>—</td>
                    </tr>
                  )}
                  <tr className="pdf-total">
                    <td>Total</td>
                    <td>{number(data.length)}</td>
                    <td>100 %</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </div>
        {footer(1)}
      </article>
      {!preview && include("protected") && (
        <article className="pdf-page" data-pdf-page>
          {header()}
          <h1>Focos en áreas protegidas</h1>
          <p className="pdf-subtitle">
            {periodLabel(config)} · {number(protectedData.length)} focos en
            áreas protegidas
          </p>
          <RankingChart values={ranking(data, "protectedArea")} />
          <section className="pdf-methodology">
            <h3>Cómo interpretar este reporte</h3>
            <p>
              Un foco de calor indica una anomalía térmica. No confirma por sí
              solo un incendio forestal. La nubosidad, la resolución del sensor
              y el horario de paso del satélite pueden afectar las detecciones.
            </p>
            <h3>Fuentes y alcance</h3>
            <p>
              NASA FIRMS integra observaciones de VIIRS y MODIS. Los horarios de
              este reporte corresponden a Bolivia (UTC−4).
            </p>
            <p>
              Este archivo es una demostración de la interfaz. Sus cifras,
              capas, coordenadas y límites son ilustrativos y no deben
              utilizarse para localizar emergencias.
            </p>
          </section>
          {footer(2)}
        </article>
      )}
      {!preview &&
        include("table") &&
        Array.from({ length: Math.ceil(data.length / 28) }, (_, i) => (
          <article className="pdf-page pdf-detail-page" data-pdf-page key={i}>
            {header()}
            <h3>Detecciones del periodo</h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Fecha · hora</th>
                  <th>Municipio</th>
                  <th>FRP</th>
                  <th>Coordenadas</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(i * 28, (i + 1) * 28).map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.date} · {d.time}
                    </td>
                    <td>{d.municipality}</td>
                    <td>{d.frp}</td>
                    <td>
                      {d.latitude}, {d.longitude}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {footer(2 + (include("protected") ? 1 : 0) + i)}
          </article>
        ))}
    </div>
  );
}
