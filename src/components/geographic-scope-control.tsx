"use client";
import { countries, continents, scopeBbox } from "@/lib/geo/scope";
import { REGIONAL_BBOX } from "@/lib/geo/catalog";
import type { Bbox } from "@/lib/geo/catalog";
export function GeographicScopeControl({
  continent,
  country,
  onChange,
  local,
}: {
  continent?: string;
  country?: string;
  local?: boolean;
  onChange: (scope: {
    continent: string;
    country: string;
    local: boolean;
    bbox: Bbox;
  }) => void;
}) {
  return (
    <>
      <label className="field">
        Continente
        <select
          aria-label="Continente"
          value={continent || ""}
          onChange={(e) =>
            onChange({
              local: false,
              continent: e.target.value,
              country: "",
              bbox: scopeBbox(e.target.value),
            })
          }
        >
          <option value="">Todo el mundo</option>
          {continents.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        País o territorio
        <select
          aria-label="País o territorio"
          value={country || ""}
          onChange={(e) => {
            const country = e.target.value;
            const nextContinent =
              countries.find((c) => c.code === country)?.continent ||
              continent ||
              "";
            onChange({
              country,
              local: false,
              continent: nextContinent,
              bbox: scopeBbox(nextContinent, country),
            });
          }}
        >
          <option value="">
            {continent ? "Todo el continente" : "Todos los países"}
          </option>
          {countries
            .filter((c) => !continent || c.continent === continent)
            .map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      {country === "BOL" && (
        <label className="field">
          Región
          <select
            aria-label="Región de Bolivia"
            value={local ? "cochabamba" : ""}
            onChange={(e) =>
              onChange({
                country: "BOL",
                continent: "América del Sur",
                local: e.target.value === "cochabamba",
                bbox:
                  e.target.value === "cochabamba"
                    ? REGIONAL_BBOX
                    : scopeBbox("América del Sur", "BOL"),
              })
            }
          >
            <option value="">Toda Bolivia</option>
            <option value="cochabamba">Cochabamba · reto local</option>
          </select>
        </label>
      )}
    </>
  );
}
