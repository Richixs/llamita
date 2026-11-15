"use client";
import { useId, useRef, useState, type PointerEvent } from "react";
import artwork from "@/lib/map/artwork.json";
import { municipalities, type Detection } from "@/lib/llamita/data";
import {
  byIntensity,
  HOTSPOT_OUTLINE_WIDTH,
  hotspotStyle,
} from "@/lib/llamita/hotspot-style";
export interface Layers {
  hotspots: boolean;
  boundaries: boolean;
  protected: boolean;
  territories: boolean;
  forest: boolean;
  scars: boolean;
}
export const defaultLayers: Layers = {
  hotspots: true,
  boundaries: true,
  protected: false,
  territories: false,
  forest: false,
  scars: false,
};
export function MapArtwork({
  data,
  selected = [],
  layers = defaultLayers,
  zoom = 1,
  satellite = false,
  interactive = false,
  onSelect,
  focusedId,
  svgId,
}: {
  data: Detection[];
  selected?: string[];
  layers?: Layers;
  zoom?: number;
  satellite?: boolean;
  interactive?: boolean;
  onSelect?: (d: Detection) => void;
  focusedId?: string;
  svgId?: string;
}) {
  const id = useId().replaceAll(":", "");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
  } | null>(null);
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const scale = 1060 / e.currentTarget.getBoundingClientRect().width;
    const dx = ((e.clientX - drag.current.x) * scale) / zoom,
      dy = ((e.clientY - drag.current.y) * scale) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
  }
  const focused = data.find((d) => d.id === focusedId);
  // Markers live inside the zoomed group: dividing by sqrt(zoom) lets them
  // grow gently when zooming in instead of ballooning with the map.
  const strokeScale = 1 / Math.sqrt(zoom);
  const markerScale = (data.length > 400 ? 0.45 : 0.6) * strokeScale;
  const hotspots = byIntensity(data);
  const center = focused ? { x: focused.x, y: focused.y } : { x: 910, y: 482 };
  return (
    <svg
      id={svgId}
      className={`map-artwork ${interactive ? "interactive" : ""}`}
      viewBox="380 64 1060 836"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Mapa ilustrativo de Cochabamba con ${data.length} focos de calor de ejemplo`}
      onPointerDown={
        interactive
          ? (e) => {
              if ((e.target as Element).closest("[data-marker]")) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
                moved: false,
              };
            }
          : undefined
      }
      onPointerMove={interactive ? pointerMove : undefined}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <defs>
        <pattern
          id={`forest-${id}`}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 10 10 0" stroke="#2F7A55" opacity=".4" />
        </pattern>
        <pattern
          id={`scars-${id}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="1.5" fill="#B8371C" />
        </pattern>
      </defs>
      <rect
        x="380"
        y="64"
        width="1060"
        height="836"
        fill="var(--color-mapa-tierra)"
      />
      <g
        transform={`translate(910 482) scale(${zoom}) translate(${-center.x + pan.x} ${-center.y + pan.y})`}
      >
        {satellite && (
          <image
            href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-67.9,-18.9,-63.5,-15.5&bboxSR=4326&size=1600,1262&imageSR=4326&format=jpg&f=image"
            x="380"
            y="64"
            width="1060"
            height="836"
            preserveAspectRatio="none"
          />
        )}
        {municipalities.map((m) => (
          <path
            key={m.id}
            d={m.d}
            fill={
              selected.includes(m.name)
                ? "var(--color-fuego-suave)"
                : satellite
                  ? "transparent"
                  : "var(--color-mapa-municipio)"
            }
            fillOpacity={satellite && selected.includes(m.name) ? 0.65 : 1}
            stroke={
              selected.includes(m.name)
                ? "var(--color-fuego)"
                : layers.boundaries
                  ? "var(--color-mapa-borde)"
                  : "none"
            }
            strokeWidth={selected.includes(m.name) ? 1.5 : 1}
          />
        ))}
        {layers.forest &&
          [8, 12, 13, 33].map((i) => (
            <path key={i} d={municipalities[i].d} fill={`url(#forest-${id})`} />
          ))}
        {layers.protected &&
          [8, 46].map((i) => (
            <path
              key={i}
              d={municipalities[i].d}
              fill="#2F7A55"
              fillOpacity=".2"
              stroke="#2F7A55"
              strokeDasharray="4 3"
            />
          ))}
        {layers.territories &&
          [12, 13].map((i) => (
            <path
              key={i}
              d={municipalities[i].d}
              fill="#2C6E99"
              fillOpacity=".2"
              stroke="#2C6E99"
              strokeDasharray="4 3"
            />
          ))}
        {layers.scars &&
          [14, 45].map((i) => (
            <path key={i} d={municipalities[i].d} fill={`url(#scars-${id})`} />
          ))}
        <path
          d={artwork.outline}
          stroke={satellite ? "white" : "var(--color-mapa-limite)"}
          strokeWidth="1.5"
          fill="none"
        />
        <g fill={satellite ? "white" : "var(--color-tinta-suave)"}>
          {artwork.labels.map((label, i) => (
            <path
              key={i}
              d={label.d}
              opacity={"opacity" in label ? label.opacity : 1}
            />
          ))}
        </g>
        {layers.hotspots && (
          <g aria-hidden="true">
            {hotspots.map((d) => {
              const style = hotspotStyle(d.frp);
              return (
                <circle
                  key={d.id}
                  cx={d.x}
                  cy={d.y}
                  r={style.haloRadius * markerScale}
                  fill={style.fill}
                  fillOpacity={0.3}
                />
              );
            })}
          </g>
        )}
        {layers.hotspots &&
          hotspots.map((d) => {
            const style = hotspotStyle(d.frp);
            return (
              <circle
                key={d.id}
                data-marker
                cx={d.x}
                cy={d.y}
                r={style.radius * markerScale}
                fill={style.fill}
                stroke={style.outline}
                strokeWidth={HOTSPOT_OUTLINE_WIDTH * strokeScale}
                onClick={interactive ? () => onSelect?.(d) : undefined}
              >
                <title>{`${d.municipality} · ${d.frp} MW · ${d.date}`}</title>
              </circle>
            );
          })}
        {focused && (
          <circle
            cx={focused.x}
            cy={focused.y}
            r={(hotspotStyle(focused.frp).radius + 4) * markerScale}
            fill="none"
            stroke={satellite ? "white" : "var(--color-carbon)"}
            strokeWidth={2.5 * strokeScale}
          />
        )}
      </g>
    </svg>
  );
}
