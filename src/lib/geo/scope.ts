import countries from "./country-catalog.json" with { type: "json" };
import { WORLD_BBOX, type Bbox } from "./catalog";
export { countries };
export const continents = [
  ...new Set(countries.map((c) => c.continent)),
].sort();
export function scopeBbox(continent?: string, country?: string): Bbox {
  const selected = countries.filter((c) =>
    country ? c.code === country : continent ? c.continent === continent : true,
  );
  if ((!continent && !country) || !selected.length) return WORLD_BBOX;
  return [
    Math.min(...selected.map((c) => c.bbox[0])),
    Math.min(...selected.map((c) => c.bbox[1])),
    Math.max(...selected.map((c) => c.bbox[2])),
    Math.max(...selected.map((c) => c.bbox[3])),
  ];
}
export function scopeLabel(scope: {
  country?: string;
  continent?: string;
  areaType?: string;
  areas?: string[];
  bbox?: Bbox;
  local?: boolean;
}) {
  const name =
    countries.find((c) => c.code === scope.country)?.name ||
    scope.continent ||
    (scope.bbox && !scope.bbox.every((v, i) => v === WORLD_BBOX[i])
      ? "Área seleccionada"
      : "Todo el mundo");
  if (scope.local && !scope.areas?.length) return "Cochabamba · Bolivia";
  return scope.areas?.length ? `${scope.areas.join(", ")} · ${name}` : name;
}
