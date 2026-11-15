"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GAMC_LAYERS, type Bbox, type GamcLayerId } from "@/lib/geo/catalog";
import { heatColor, type Detection } from "@/lib/llamita/data";
export interface MapApi {
  getBbox: () => Bbox;
  fit: (bbox: Bbox) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}
export interface FeatureInfo {
  layer: string;
  features: { properties?: Record<string, unknown> }[];
  error?: string;
}
export default function GeographicMap({
  data,
  bbox,
  activeLayers,
  satellite,
  showHotspots,
  focusId,
  onPoint,
  onFeatures,
  onLayerError,
  apiRef,
  selectedBoundary,
}: {
  data: Detection[];
  bbox: Bbox;
  activeLayers: GamcLayerId[];
  satellite: boolean;
  showHotspots: boolean;
  focusId: string;
  onPoint: (d: Detection) => void;
  onFeatures: (value: FeatureInfo[] | null) => void;
  onLayerError: (layer: string) => void;
  apiRef: React.RefObject<MapApi | null>;
  selectedBoundary?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const callbacks = useRef({ onPoint, onFeatures, onLayerError });
  useEffect(() => {
    callbacks.current = { onPoint, onFeatures, onLayerError };
  }, [onPoint, onFeatures, onLayerError]);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, {
      zoomControl: false,
      preferCanvas: true,
      maxZoom: 19,
      minZoom: 4,
      center: [-17.39, -66.17],
      zoom: 12,
    });
    mapRef.current = map;
    L.control.scale({ imperial: false }).addTo(map);
    apiRef.current = {
      getBbox: () => {
        const b = map.getBounds();
        return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      },
      fit: (b) =>
        map.fitBounds([
          [b[1], b[0]],
          [b[3], b[2]],
        ]),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
    };
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      apiRef.current = null;
    };
    // The map is created once. Subsequent changes update layers below.
  }, [apiRef]);
  useEffect(() => {
    mapRef.current?.fitBounds([
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]],
    ]);
  }, [bbox]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tile = satellite
      ? L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
            maxZoom: 19,
          },
        )
      : L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        });
    tile.addTo(map);
    return () => {
      map.removeLayer(tile);
    };
  }, [satellite]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = activeLayers.map((id) => {
      const layer = GAMC_LAYERS.find((l) => l.id === id)!;
      const tile = L.tileLayer.wms(
        `/api/gamc/wms?layer=${encodeURIComponent(id)}`,
        {
          layers: "",
          format: "image/png",
          transparent: true,
          version: "1.1.1",
          maxZoom: 19,
          attribution: "GAMC",
          zIndex: 250 + GAMC_LAYERS.indexOf(layer),
        },
      );
      tile.on("tileerror", () => callbacks.current.onLayerError(layer.name));
      tile.addTo(map);
      return tile;
    });
    let request: AbortController | null = null;
    async function click(event: L.LeafletMouseEvent) {
      if (!activeLayers.length) {
        callbacks.current.onFeatures(null);
        return;
      }
      request?.abort();
      request = new AbortController();
      const signal = request.signal;
      const size = map!.getSize(),
        bounds = map!.getBounds();
      const sw = L.CRS.EPSG3857.project(bounds.getSouthWest()),
        ne = L.CRS.EPSG3857.project(bounds.getNorthEast());
      const width = Math.min(1024, size.x),
        height = Math.min(1024, size.y),
        pixel = map!.latLngToContainerPoint(event.latlng);
      const results = await Promise.all(
        activeLayers.map(async (id) => {
          const layer = GAMC_LAYERS.find((l) => l.id === id)!;
          const params = new URLSearchParams({
            layer: id,
            SERVICE: "WMS",
            VERSION: "1.1.1",
            REQUEST: "GetFeatureInfo",
            LAYERS: "",
            SRS: "EPSG:3857",
            BBOX: [sw.x, sw.y, ne.x, ne.y].join(","),
            WIDTH: String(width),
            HEIGHT: String(height),
            X: String(
              Math.max(
                0,
                Math.min(width - 1, Math.floor((pixel.x / size.x) * width)),
              ),
            ),
            Y: String(
              Math.max(
                0,
                Math.min(height - 1, Math.floor((pixel.y / size.y) * height)),
              ),
            ),
            INFO_FORMAT: "application/json",
            FEATURE_COUNT: "5",
          });
          try {
            const response = await fetch(`/api/gamc/wms?${params}`, { signal });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error || "No se pudieron consultar los atributos.",
              );
            return {
              layer: layer.name,
              features: result.features,
            } as FeatureInfo;
          } catch (error) {
            return {
              layer: layer.name,
              features: [],
              error:
                error instanceof Error ? error.message : "Error de consulta.",
            };
          }
        }),
      );
      if (!signal.aborted) callbacks.current.onFeatures(results);
    }
    map.on("click", click);
    return () => {
      request?.abort();
      map.off("click", click);
      layers.forEach((l) => map.removeLayer(l));
    };
  }, [activeLayers]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const group = L.layerGroup().addTo(map);
    if (showHotspots)
      for (const d of data) {
        const marker = L.circleMarker([d.latitude, d.longitude], {
          radius: d.id === focusId ? 8 : 5,
          fillColor: heatColor(d.frp),
          fillOpacity: 1,
          color: d.id === focusId ? "#241A16" : "white",
          weight: 1,
          bubblingMouseEvents: false,
        });
        const label = document.createElement("span");
        label.textContent = `${d.satellite} · ${d.frp} MW · ${d.date} ${d.time}`;
        marker.bindTooltip(label);
        marker.on("click", () => callbacks.current.onPoint(d));
        marker.addTo(group);
      }
    const focus = data.find((d) => d.id === focusId);
    if (focus)
      map.setView(
        [focus.latitude, focus.longitude],
        Math.max(map.getZoom(), 12),
      );
    return () => {
      map.removeLayer(group);
    };
  }, [data, showHotspots, focusId]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBoundary) return;
    const layer = L.geoJSON(selectedBoundary, {
      style: {
        color: "#C2361C",
        weight: 2,
        fill: true,
        fillOpacity: 0.05,
      },
      interactive: false,
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [24, 24] });
    return () => {
      map.removeLayer(layer);
    };
  }, [selectedBoundary]);
  return (
    <div
      ref={container}
      className="geographic-map"
      role="region"
      aria-label="Mapa geográfico de detecciones FIRMS y capas municipales GAMC"
    />
  );
}
