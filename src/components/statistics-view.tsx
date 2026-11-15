"use client";
import { useState } from "react";
import Link from "next/link";
import { scopeLabel } from "@/lib/geo/scope";
import { DataNotice } from "./data-mode-control";
import { useApp } from "./app-provider";
import { Icon } from "./icon";
import { DailyChart, Metrics, RankingChart } from "./charts";
import { byDay, ranking, type Detection } from "@/lib/llamita/data";
import { dateLabel, number, periodLabel } from "@/lib/llamita/filters";
import "./statistics.css";
export function StatisticsView() {
  const { filters, updateFilters, data, loading, error } = useApp();
  const [page, setPage] = useState(0);
  const from = filters.mode === "day" ? filters.to : filters.from;
  const days = byDay(data, from, filters.to);
  const peak = days.toSorted((a, b) => b.count - a.count)[0];
  const municipal = ranking(data, "municipality");
  const countries = ranking(data, "country");
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
      municipality: "",
      province: "",
    });
  }
  return (
    <main id="contenido" className="page statistics-page">
      <div className="page-heading">
        <div>
          <h1>Estadísticas de focos de calor</h1>
          <p>
            {scopeLabel({
              ...filters,
              areas: [filters.municipality || filters.province].filter(Boolean),
            })}{" "}
            · {periodLabel(filters)}
          </p>
        </div>
        <button className="btn" onClick={csv} disabled={!data.length}>
          <Icon name="download" />
          Descargar CSV
        </button>
      </div>
      <DataNotice />
      {downloadError && (
        <p role="alert" className="notice error-notice">
          {downloadError}
        </p>
      )}
      <div className="stats-period row wrap">
        <span className="text-caption muted">
          NASA FIRMS · detecciones reales
        </span>
        <Link href="/" className="text-link">
          Cambiar filtros en el mapa
        </Link>
      </div>
      <Metrics
        values={[
          {
            label: "Focos detectados",
            value: loading || error ? "—" : number(data.length),
            description: "Detecciones del periodo seleccionado",
          },
          {
            label: "Países con detecciones",
            value: number(
              countries.filter((c) => c.name !== "Sin asignar").length,
            ),
            description:
              "Asignación con límites cartográficos de Natural Earth",
          },
          {
            label: "FRP máximo",
            value: `${data.reduce((max, d) => Math.max(max, d.frp), 0).toFixed(1)} MW`,
            description: "Potencia radiativa máxima observada",
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
          <h3>
            {loading
              ? "Consultando detecciones…"
              : error
                ? "No se pudo completar la consulta"
                : "No hay detecciones para este periodo"}
          </h3>
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
              <h4>Países con más focos</h4>
              <RankingChart values={countries.slice(0, 15)} highlight />
            </section>
            <section className="panel">
              <h4>Focos por sensor</h4>
              <RankingChart values={ranking(data, "satellite")} highlight />
              <p className="text-caption muted">
                Las detecciones coincidentes se agrupan en una cuadrícula
                aproximada de 1 km por día; el sensor mostrado es el
                representativo.
              </p>
              {municipal.some((m) => m.name !== "Sin asignar") && (
                <>
                  <h4>Municipios · reto local Cochabamba</h4>
                  <RankingChart
                    values={municipal
                      .filter((m) => m.name !== "Sin asignar")
                      .slice(0, 10)}
                  />
                </>
              )}
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
                    <th>País</th>
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
                      <td>{d.country || "Sin asignar"}</td>
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
