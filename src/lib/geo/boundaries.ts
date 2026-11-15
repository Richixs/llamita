import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import provinciasData from "./data/provincias-cochabamba.json" with { type: "json" };
import municipiosData from "./data/municipios-cochabamba.json" with { type: "json" };

// Sourced from geoBoundaries (BOL ADM2/ADM3), which in turn derives from
// GeoBolivia (geo.gob.bo), the official government geoportal — clipped to
// the Cochabamba department by spatial filtering against ADM1, not by name
// matching (geoBoundaries' simplified export carries no department field).
type NamedBoundaries = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { name: string }
>;

const provincias = provinciasData as NamedBoundaries;
const municipios = municipiosData as NamedBoundaries;

export const UNASSIGNED = "Sin asignar";

function findName(
  collection: NamedBoundaries,
  lat: number,
  lon: number,
): string {
  const target = point([lon, lat]);
  const match = collection.features.find((feature) =>
    booleanPointInPolygon(target, feature),
  );
  return match?.properties.name ?? UNASSIGNED;
}

export function findProvince(lat: number, lon: number): string {
  return findName(provincias, lat, lon);
}

export function findMunicipality(lat: number, lon: number): string {
  return findName(municipios, lat, lon);
}

export function listProvinces(): string[] {
  return provincias.features.map((f) => f.properties.name).sort();
}

export function listMunicipalities(): string[] {
  return municipios.features.map((f) => f.properties.name).sort();
}

export type BoundaryType = "province" | "municipality";

export type NamedBoundaryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { name: string }
>;

export function getBoundary(
  type: BoundaryType,
  name: string,
): NamedBoundaryFeature | undefined {
  const collection = type === "province" ? provincias : municipios;
  return collection.features.find((f) => f.properties.name === name);
}
