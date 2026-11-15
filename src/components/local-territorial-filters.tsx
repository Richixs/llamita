"use client";
import {
  COCHABAMBA_MUNICIPALITIES,
  COCHABAMBA_PROVINCES,
  MUNICIPALITIES_BY_PROVINCE,
} from "@/lib/geo/names";
export function LocalTerritorialFilters({
  province,
  municipality,
  onChange,
}: {
  province: string;
  municipality: string;
  onChange: (value: { province: string; municipality: string }) => void;
}) {
  const allowed = province
    ? MUNICIPALITIES_BY_PROVINCE[province] || []
    : COCHABAMBA_MUNICIPALITIES;
  return (
    <fieldset className="territorial-filters">
      <legend className="overline">Cochabamba · reto local</legend>
      <label className="field">
        Provincia
        <select
          aria-label="Filtrar por provincia"
          value={province}
          onChange={(e) => {
            const selected = e.target.value;
            const members = selected
              ? MUNICIPALITIES_BY_PROVINCE[selected] || []
              : COCHABAMBA_MUNICIPALITIES;
            onChange({
              province: selected,
              municipality: members.includes(municipality) ? municipality : "",
            });
          }}
        >
          <option value="">Todas</option>
          {COCHABAMBA_PROVINCES.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Municipio
        <select
          aria-label="Filtrar por municipio"
          value={municipality}
          onChange={(e) => onChange({ province, municipality: e.target.value })}
        >
          <option value="">Todos</option>
          {allowed.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        TCO / áreas protegidas
        <input placeholder="Fuente pendiente" disabled />
      </label>
    </fieldset>
  );
}
