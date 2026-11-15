import type { Metadata } from "next";
import { StatisticsView } from "@/components/statistics-view";
export const metadata: Metadata = { title: "Estadísticas" };
export default function StatisticsPage() {
  return <StatisticsView />;
}
