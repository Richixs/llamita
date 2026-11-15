import type { Metadata } from "next";
import { ReportBuilder } from "@/components/report-builder";
export const metadata: Metadata = { title: "Generar reporte" };
export default function ReportsPage() {
  return <ReportBuilder />;
}
