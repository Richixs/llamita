import type { Metadata } from "next";
import { PdfView } from "@/components/pdf-view";
export const metadata: Metadata = { title: "Reporte PDF A4" };
export default function PdfPage() {
  return <PdfView />;
}
