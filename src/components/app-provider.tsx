"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialFilters, type Filters } from "@/lib/llamita/filters";
interface AppState {
  filters: Filters;
  updateFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
}
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(initialFilters);
  return (
    <AppContext.Provider
      value={{
        filters,
        updateFilters: (patch) =>
          setFilters((current) => ({ ...current, ...patch })),
        resetFilters: () => setFilters(initialFilters),
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
