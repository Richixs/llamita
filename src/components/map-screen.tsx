"use client";
import { LiveMapView } from "./live-map-view";
export function MapScreen({ initialFocus }: { initialFocus?: string }) {
  return <LiveMapView initialFocus={initialFocus} />;
}
