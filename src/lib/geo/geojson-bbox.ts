import type { Bbox } from "./catalog";

// Client-safe: works on a single already-fetched Feature, no turf, no
// bundling the full province/municipio geometry files.
export function boundaryBbox(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
  paddingRatio = 0.05,
): Bbox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  const padLon = (maxLon - minLon) * paddingRatio;
  const padLat = (maxLat - minLat) * paddingRatio;
  return [minLon - padLon, minLat - padLat, maxLon + padLon, maxLat + padLat];
}
