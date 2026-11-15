"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { ReportDocument } from "./report-document";
import {
  defaultReport,
  isReportConfig,
  DRAFT_STORAGE_KEY,
  reportData,
  type ReportConfig,
} from "@/lib/llamita/report";
import "./statistics.css";
import "./map.css";
import "./reports.css";
export function PdfView() {
  const [config, setConfig] = useState(defaultReport);
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ReportConfig;
          if (isReportConfig(parsed)) setConfig(parsed);
        }
      } catch {
        /* The default example remains available. */
      }
    };
    load();
  }, []);
  return (
    <main id="contenido" className="pdf-workspace">
      <div className="print-toolbar">
        <Link className="btn" href="/reportes">
          <Icon name="left" />
          Volver a reportes
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="download" />
          Imprimir / Guardar PDF
        </button>
      </div>
      <ReportDocument config={config} data={reportData(config)} />
    </main>
  );
}
