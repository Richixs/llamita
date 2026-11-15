"use client";
import { useState } from "react";
import { ReportMap } from "./report-map";
import type { Detection } from "@/lib/llamita/data";
import { csvText, geojson } from "@/lib/llamita/downloads";
import { exportSheets } from "@/lib/llamita/export-data";
import { WORLD_BBOX } from "@/lib/geo/catalog";
import { reportPlan } from "@/lib/llamita/report-model";
import type { ReportConfig } from "@/lib/llamita/report";
import { ReportDocument } from "./report-document";
export function ReportFormatPreview({
  config,
  data,
  generatedAt,
}: {
  config: ReportConfig;
  data: Detection[];
  generatedAt: string;
}) {
  const [page, setPage] = useState(0),
    [sheet, setSheet] = useState("Detecciones");
  if (config.format === "PDF") {
    const plan = reportPlan(config, data),
      current = Math.min(page, plan.length - 1);
    const labels = {
      overview: "Resumen y mapa",
      ranking: "Rankings por país y sensor",
      "local-ranking": "Rankings del reto local",
      warnings: "Disponibilidad",
      table: "Detecciones",
    };
    return (
      <>
        <label className="field">
          Página del PDF
          <select
            aria-label="Página del PDF"
            value={current}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {plan.map((p, i) => (
              <option key={i} value={i}>
                {i + 1} · {labels[p.kind]}
              </option>
            ))}
          </select>
        </label>
        <div className="report-preview">
          <div className="preview-sheet">
            <ReportDocument
              config={config}
              data={data}
              preview
              previewPage={current}
              generatedAt={generatedAt}
            />
          </div>
        </div>
        <p className="text-caption muted">
          Página {current + 1} de {plan.length} · PDF A4
        </p>
      </>
    );
  }
  if (config.format === "CSV")
    return (
      <>
        <p className="text-caption muted">
          Encabezado y primeras {Math.min(10, data.length)} filas de{" "}
          {data.length}. El archivo incluye todas las detecciones.
        </p>
        <pre className="format-code" tabIndex={0}>
          {csvText(data.slice(0, 10)).replace(/^\uFEFF/, "")}
        </pre>
      </>
    );
  if (config.format === "Excel") {
    const sheets = exportSheets(data, 10),
      current = sheets.find((s) => s.name === sheet) || sheets[0];
    const rows = current.rows.slice(0, 10),
      columns = Object.keys(rows[0] || {});
    return (
      <>
        <label className="field">
          Hoja del libro
          <select
            value={current.name}
            onChange={(e) => setSheet(e.target.value)}
          >
            {sheets.map((s) => (
              <option key={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
        <div className="table-scroll format-table" tabIndex={0}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c}>{row[c]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-caption muted">
          Primeras {rows.length} filas de la hoja. El libro contiene todas las
          detecciones y los rankings completos.
        </p>
      </>
    );
  }
  const features = geojson(data.slice(0, 3));
  return (
    <>
      <ReportMap data={data.slice(0, 2000)} bbox={config.bbox || WORLD_BBOX} />
      <p className="text-caption muted">
        {Math.min(2000, data.length)} de {data.length} puntos en esta vista. La
        descarga contiene todos los puntos y sus atributos, con coordenadas
        WGS84 (EPSG:4326).
      </p>
      {config.format === "GeoJSON" ? (
        <pre className="format-code" tabIndex={0}>
          {JSON.stringify(features, null, 2)}
        </pre>
      ) : (
        <>
          <p>El ZIP contiene:</p>
          <ul>
            <li>focos.shp · geometría de puntos</li>
            <li>focos.shx · índice espacial</li>
            <li>focos.dbf · país, municipio, fecha, sensor, FRP y producto</li>
            <li>focos.prj · referencia WGS84</li>
          </ul>
          <pre className="format-code" tabIndex={0}>
            {JSON.stringify(features.features[0]?.properties || {}, null, 2)}
          </pre>
        </>
      )}
      <p className="text-caption muted">
        Atributos de las primeras{" "}
        {config.format === "GeoJSON"
          ? features.features.length
          : Math.min(1, data.length)}{" "}
        detecciones.
      </p>
    </>
  );
}
