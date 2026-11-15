import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import countries from "./data/countries.json" with { type: "json" };
import catalog from "./country-catalog.json" with { type: "json" };

type CountryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { code: string; name: string }
>;
const features = (
  countries as GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    { code: string; name: string }
  >
).features;
const index = features.map((feature) => ({
  feature,
  bbox: catalog.find((c) => c.code === feature.properties.code)!.bbox,
}));
export function countryFeature(code: string): CountryFeature | undefined {
  return features.find((f) => f.properties.code === code);
}
export function locateCountry(latitude: number, longitude: number) {
  const match = index.find(
    ({ feature, bbox: [w, s, e, n] }) =>
      longitude >= w &&
      longitude <= e &&
      latitude >= s &&
      latitude <= n &&
      booleanPointInPolygon([longitude, latitude], feature),
  );
  return match?.feature.properties;
}
export function inCountry(code: string, latitude: number, longitude: number) {
  const feature = countryFeature(code);
  return !!feature && booleanPointInPolygon([longitude, latitude], feature);
}
