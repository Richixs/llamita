"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./app-provider";
import { Icon } from "./icon";
import { DailyChart, Metrics, RankingChart } from "./charts";
import {
  byDay,
  filterDetections,
  ranking,
  type Detection,
} from "@/lib/llamita/data";
import { dateLabel, number, periodLabel } from "@/lib/llamita/filters";
import "./statistics.css";
export function StatisticsView() {
  const { filters, updateFilters } = useApp();
  const [page, setPage] = useState(0);
  const data = filterDetections(filters);
  const from = filters.mode === "day" ? filters.to : filters.from;
  const days = byDay(data, from, filters.to);
  const peak = days.toSorted((a, b) => b.count - a.count)[0];
  const municipal = ranking(data, "municipality");
  const areas = ranking(data, "protectedArea");
  const protectedCount = data.filter((d) => d.protectedArea).length;
  const pageCount = Math.ceil(data.length / 6);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const start = currentPage * 6;
  const [downloadError, setDownloadError] = useState("");
  async function csv() {
    try {
      const { downloadCsv } = await import("@/lib/llamita/downloads");
      downloadCsv(data);
    } catch {
      setDownloadError("No se pudo descargar el archivo. Intenta de nuevo.");
    }
  }
  function showOnMap(d: Detection) {
    updateFilters({
      mode: "day",
      to: d.date,
      from: d.date,
      municipality: d.municipality,
      province: d.province,
    });
  }
  return (
    <main id="contenido" className="page statistics-page">
      <div className="page-heading">
        <div>
          <h1>Estadísticas de focos de calor</h1>
          <p>
            {filters.municipality || filters.province || "Cochabamba"} ·{" "}
            {periodLabel(filters)}
          </p>
        </div>
        <button className="btn" onClick={csv} disabled={!data.length}>
          <Icon name="download" />
          Descargar CSV
        </button>
      </div>
      {downloadError && (
        <p role="alert" className="notice error-notice">
          {downloadError}
        </p>
      )}
      <div className="stats-period row wrap">
        <span className="text-caption muted">Datos de ejemplo del diseño</span>
        <button
          className="text-link"
          onClick={() => {
            updateFilters({
              mode: "range",
              from: "2026-11-01",
              to: "2026-11-14",
            });
            setPage(0);
          }}
        >
          Ver periodo del 1 al 14 nov
        </button>
        <Link href="/" className="text-link">
          Cambiar filtros en el mapa
        </Link>
      </div>
      <Metrics
        values={[
          {
            label: "Focos detectados",
            value: number(data.length),
            description: "Detecciones del periodo seleccionado",
          },
          {
            label: "Municipios afectados",
            value: `${municipal.length} de 47`,
            description: municipal[0]
              ? `${municipal[0].name} concentra el ${Math.round((municipal[0].count / data.length) * 100)} %`
              : "Sin municipios afectados",
          },
          {
            label: "En áreas protegidas",
            value: number(protectedCount),
            description: `${data.length ? Math.round((protectedCount / data.length) * 100) : 0} % del total · ${areas.filter((a) => a.name !== "Fuera de áreas").length} áreas`,
          },
          {
            label: "Día con más focos",
            value: peak?.count
              ? dateLabel(peak.name, { year: undefined })
              : "—",
            description: `${number(peak?.count || 0)} focos ese día`,
          },
        ]}
      />
      {!data.length ? (
        <section className="panel stats-empty">
          <Icon name="search" />
          <h3>No hay detecciones para este periodo</h3>
          <p className="muted">
            Cambia los filtros en el mapa para explorar otras fechas o lugares.
          </p>
          <Link href="/" className="btn">
            Volver al mapa
          </Link>
        </section>
      ) : (
        <>
          <section className="panel daily-panel">
            <h4>Focos por día</h4>
            <p className="muted text-body-sm">
              Cuántos focos se detectaron cada día del periodo
            </p>
            <DailyChart values={days} />
            <p className="text-caption muted">
              {dateLabel(from, { day: undefined })} · el día con más focos se
              marca en naranja
            </p>
          </section>
          <div className="stats-comparison">
            <section className="panel">
              <h4>Municipios con más focos</h4>
              <p className="muted text-body-sm">
                Top 10 de {municipal.length} municipios con focos
              </p>
              <RankingChart
                values={[
                  ...municipal.slice(0, 10),
                  ...(municipal.length > 10
                    ? [
                        {
                          name: `Otros ${municipal.length - 10} municipios`,
                          count: municipal
                            .slice(10)
                            .reduce((s, v) => s + v.count, 0),
                        },
                      ]
                    : []),
                ]}
                highlight
              />
            </section>
            <section className="panel">
              <h4>Por provincia</h4>
              <p className="muted text-body-sm">
                Provincias con al menos un foco
              </p>
              <RankingChart values={ranking(data, "province")} highlight />
              <div className="areas-ranking">
                <h4>Áreas protegidas</h4>
                <p className="muted text-body-sm">
                  Focos dentro de áreas protegidas nacionales
                </p>
                <RankingChart values={areas} />
              </div>
            </section>
          </div>
          <section className="panel detections-panel">
            <h4>Detecciones del periodo</h4>
            <p className="muted text-body-sm">
              Ordenadas de la más reciente a la más antigua · hora de Bolivia
              (UTC−4)
            </p>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Municipio</th>
                    <th>Provincia</th>
                    <th>FRP (MW)</th>
                    <th>Coordenadas</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(start, start + 6).map((d) => (
                    <tr key={d.id}>
                      <td className="mono">
                        {dateLabel(d.date)} · {d.time}
                      </td>
                      <td>{d.municipality}</td>
                      <td>{d.province}</td>
                      <td className="mono">
                        {d.frp.toLocaleString("es-BO", {
                          minimumFractionDigits: 1,
                        })}
                      </td>
                      <td className="mono">
                        {d.latitude}, {d.longitude}
                      </td>
                      <td>
                        <Link
                          className="text-link row"
                          href={`/?foco=${d.id}`}
                          onClick={() => showOnMap(d)}
                        >
                          <Icon name="pin" />
                          Ver en el mapa
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination row">
              <p className="muted text-body-sm" aria-live="polite">
                Mostrando {start + 1} – {Math.min(start + 6, data.length)} de{" "}
                {number(data.length)} detecciones
              </p>
              <div className="row">
                <button
                  className="btn"
                  disabled={!currentPage}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <Icon name="left" />
                  Anterior
                </button>
                <button
                  className="btn"
                  disabled={currentPage + 1 >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Siguiente
                  <Icon name="right" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
