"use client";
import { useApp } from "./app-provider";
import { MapView } from "./map-view";
import { LiveMapView } from "./live-map-view";
export function MapScreen({ initialFocus }: { initialFocus?: string }) {
  const { mode } = useApp();
  return mode === "live" ? (
    <LiveMapView initialFocus={initialFocus} />
  ) : (
    <MapView initialFocus={initialFocus} />
  );
}
