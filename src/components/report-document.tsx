"use client";
import { LiveReportDocument } from "./live-report-document";
import type { Detection } from "@/lib/llamita/data";
import type { ReportConfig } from "@/lib/llamita/report";
import "./report-document.css";
export function ReportDocument(props: {
  config: ReportConfig;
  data: Detection[];
  generatedAt: string;
  preview?: boolean;
  previewPage?: number;
}) {
  return <LiveReportDocument {...props} />;
}
