import { heatColor } from "./data";

/** Outline of every hotspot dot. */
export const HOTSPOT_OUTLINE = "#FFFFFF";
export const HOTSPOT_OUTLINE_WIDTH = 0.75;
/** Outline of the selected hotspot on light basemaps (matches --color-carbon). */
export const FOCUS_OUTLINE = "#1E1512";

// Radius in screen pixels per FRP band; bands mirror heatColor().
const RADIUS_BY_BAND = [6, 7, 8, 10, 12] as const;

function frpBand(frp: number) {
  return frp < 5 ? 0 : frp < 10 ? 1 : frp < 25 ? 2 : frp <= 50 ? 3 : 4;
}

export interface HotspotStyle {
  radius: number;
  haloRadius: number;
  fill: string;
  outline: string;
}

/** Visual style for a hotspot marker: larger and more intense with higher FRP. */
export function hotspotStyle(frp: number): HotspotStyle {
  const radius = RADIUS_BY_BAND[frpBand(frp)];
  return {
    radius,
    haloRadius: radius + 5,
    fill: heatColor(frp),
    outline: HOTSPOT_OUTLINE,
  };
}

/** Copy sorted by ascending FRP so the most intense hotspots render on top. */
export function byIntensity<T extends { frp: number }>(items: readonly T[]) {
  return [...items].sort((a, b) => a.frp - b.frp);
}
