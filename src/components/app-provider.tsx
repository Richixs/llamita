"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialFilters, type Filters } from "@/lib/llamita/filters";
import { filterDetections, type Detection } from "@/lib/llamita/data";
import { GAMC_BBOX, type Bbox } from "@/lib/geo/catalog";
import { useLiveDetections } from "./use-live-detections";
export type DataMode = "live" | "demo";
interface AppState {
  filters: Filters;
  updateFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  data: Detection[];
  loading: boolean;
  error: string;
  warnings: string[];
  fetchedAt?: string;
  reload: () => void;
  bbox: Bbox;
  setBbox: (bbox: Bbox) => void;
  today: string;
}
const AppContext = createContext<AppState | null>(null);
export function AppProvider({
  children,
  today,
}: {
  children: ReactNode;
  today: string;
}) {
  const [mode, setDataMode] = useState<DataMode>("live");
  const realFilters = { ...initialFilters, from: today, to: today };
  const [filters, setFilters] = useState<Filters>(realFilters);
  const [bbox, setBbox] = useState<Bbox>(GAMC_BBOX);
  const live = useLiveDetections({
    from: filters.mode === "day" ? filters.to : filters.from,
    to: filters.to,
    sensor: filters.satellite,
    bbox,
    enabled: mode === "live",
  });
  function setMode(next: DataMode) {
    setDataMode(next);
    setFilters(next === "demo" ? initialFilters : realFilters);
  }
  return (
    <AppContext.Provider
      value={{
        filters,
        updateFilters: (patch) =>
          setFilters((current) => ({ ...current, ...patch })),
        resetFilters: () =>
          setFilters(mode === "demo" ? initialFilters : realFilters),
        mode,
        setMode,
        data: mode === "demo" ? filterDetections(filters) : live.data,
        loading: live.loading,
        error: live.error,
        warnings: live.warnings,
        fetchedAt: live.fetchedAt,
        reload: live.reload,
        bbox,
        setBbox,
        today,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppProvider es obligatorio.");
  return context;
}
