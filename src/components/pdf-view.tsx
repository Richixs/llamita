"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./app-provider";
import { useLiveDetections } from "./use-live-detections";
import { Icon } from "./icon";
import { ReportDocument } from "./report-document";
import {
  isReportConfig,
  DRAFT_STORAGE_KEY,
  liveConfig,
  type ReportConfig,
} from "@/lib/llamita/report";
import { GAMC_BBOX } from "@/lib/geo/catalog";
import { dateLabel } from "@/lib/llamita/filters";
import "./statistics.css";
import "./map.css";
import "./reports.css";
export function PdfView() {
  const { filters, bbox, today } = useApp();
  const [config, setConfig] = useState<ReportConfig>(() =>
    liveConfig(filters, bbox),
  );
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isReportConfig(parsed)) setConfig(parsed);
        }
      } catch {
        /* Keep the current FIRMS query defaults. */
      }
    }
    load();
  }, []);
  const live = useLiveDetections({
    from: config.mode === "day" ? config.to : config.from,
    to: config.to,
    sensor: config.satellite,
    bbox: config.bbox || GAMC_BBOX,
  });
  const data = live.data;
  return (
    <main id="contenido" className="pdf-workspace">
      <div className="print-toolbar">
        <Link className="btn" href="/reportes">
          <Icon name="left" />
          Volver a reportes
        </Link>
        <button
          className="btn btn-primary"
          disabled={live.loading || !!live.error}
          onClick={() => window.print()}
        >
          <Icon name="download" />
          Imprimir / Guardar PDF
        </button>
      </div>
      {live.loading && (
        <p className="notice" role="status">
          Consultando detecciones…
        </p>
      )}
      {live.error && (
        <p className="notice error-notice" role="alert">
          {live.error}
        </p>
      )}
      <ReportDocument
        config={{
          ...config,
          warnings: live.warnings,
        }}
        data={data}
        generatedAt={dateLabel(today)}
      />
    </main>
  );
}
