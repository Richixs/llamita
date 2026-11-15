"use client";
import Image from "next/image";
import { DataModeControl } from "./data-mode-control";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { Icon } from "./icon";
import { SearchField } from "./search-field";
import { MapArtwork, defaultLayers, type Layers } from "./map-artwork";
import {
  detections,
  filterDetections,
  municipalities,
  provinces,
  territories,
  protectedAreas,
  type Detection,
} from "@/lib/llamita/data";
import {
  dateOffset,
  number,
  periodError,
  periodLabel,
} from "@/lib/llamita/filters";
import "./map.css";
export function MapView({ initialFocus = "" }: { initialFocus?: string }) {
  const { filters, updateFilters, resetFilters } = useApp();
  const data = filterDetections(filters);
  const [zoom, setZoom] = useState(initialFocus ? 2 : 1);
  const [layers, setLayers] = useState(defaultLayers);
  const [layersOpen, setLayersOpen] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [point, setPoint] = useState<Detection | null>(
    detections.find((d) => d.id === initialFocus) || null,
  );
  const [focusId, setFocusId] = useState(initialFocus);
  const mapRef = useRef<HTMLDivElement>(null);
  const layerButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!layersOpen) return;
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLayersOpen(false);
        layerButton.current?.focus();
      }
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [layersOpen]);
  const location =
    filters.municipality ||
    (filters.province ? `Provincia ${filters.province}` : "Todo Cochabamba");
  const available = municipalities.filter(
    (m) => !filters.province || m.province === filters.province,
  );
  const selected = filters.municipality
    ? [filters.municipality]
    : filters.province
      ? available.map((m) => m.name)
      : [];
  const error = periodError(
    filters.mode === "day" ? filters.to : filters.from,
    filters.to,
  );
  function quick(days: number, yesterday = false) {
    const to = yesterday ? "2026-11-13" : "2026-11-14";
    updateFilters({
      mode: days === 1 ? "day" : "range",
      from: dateOffset(to, 1 - days),
      to,
    });
    setPoint(null);
  }
  function closeLayers() {
    setLayersOpen(false);
    layerButton.current?.focus();
  }
  return (
    <main id="contenido" className="map-page">
      <button
        className="btn mobile-filter"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-expanded={filtersOpen}
      >
        <Icon name="filter" />
        {filtersOpen ? "Ocultar filtros" : "Filtros del mapa"}
      </button>
      <aside
        className={`filters-panel ${filtersOpen ? "is-open" : ""}`}
        aria-label="Filtros del mapa"
      >
        <div className="filters-heading row">
          <h4>Filtros</h4>
          <button
            className="text-link"
            onClick={() => {
              resetFilters();
              setPoint(null);
              setFocusId("");
              setZoom(1);
            }}
          >
            Limpiar todo
          </button>
        </div>
        <DataModeControl />
        <section className="filter-group">
          <h2 className="overline">Fecha</h2>
          <div className="segmented">
            {[
              ["day", "Un día"],
              ["range", "Rango"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                aria-pressed={filters.mode === mode}
                onClick={() =>
                  updateFilters({
                    mode: mode as "day" | "range",
                    from: mode === "range" ? "2026-11-01" : filters.to,
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="dates-row">
            {filters.mode === "range" && (
              <label className="field">
                Desde
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to}
                  onChange={(e) => updateFilters({ from: e.target.value })}
                />
              </label>
            )}
            <label className="field">
              {filters.mode === "day" ? "Día" : "Hasta"}
              <input
                type="date"
                value={filters.to}
                min={filters.mode === "range" ? filters.from : undefined}
                onChange={(e) => updateFilters({ to: e.target.value })}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-caption form-error">
              {error}
            </p>
          )}
          <div className="row quick-dates">
            {[
              ["Hoy", 1],
              ["Ayer", 1],
              ["7 días", 7],
              ["30 días", 30],
            ].map(([label, days]) => (
              <button
                key={label}
                className="pill"
                aria-pressed={
                  label === "Hoy" &&
                  filters.mode === "day" &&
                  filters.to === "2026-11-14"
                }
                onClick={() => quick(Number(days), label === "Ayer")}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
        <section className="filter-group">
          <h2 className="overline">Ubicación</h2>
          <SearchField
            label="Provincia"
            placeholder="Buscar provincia"
            value={filters.province}
            options={provinces.map((name) => ({ name }))}
            onChange={(province) => {
              updateFilters({ province, municipality: "" });
              setPoint(null);
            }}
          />
          <SearchField
            label="Municipio"
            placeholder="Buscar municipio"
            heading={`municipios${filters.province ? ` en ${filters.province}` : ""}`}
            value={filters.municipality}
            options={available.map((m) => ({
              name: m.name,
              count: filterDetections({ ...filters, municipality: m.name })
                .length,
            }))}
            onChange={(municipality) => {
              updateFilters({ municipality });
              setPoint(null);
            }}
          />
          <SearchField
            label="TCO"
            placeholder="Buscar territorio (TCO)"
            value={filters.territory}
            options={territories.map((name) => ({ name }))}
            onChange={(territory) => updateFilters({ territory })}
          />
          <label className="field">
            Áreas protegidas
            <select
              value={filters.protectedArea}
              onChange={(e) => updateFilters({ protectedArea: e.target.value })}
            >
              <option value="">Todas</option>
              {protectedAreas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </section>
        <section className="filter-group">
          <h2 className="overline">Satélite</h2>
          <label className="field">
            <span className="sr-only">Sensor satelital</span>
            <select
              value={filters.satellite}
              onChange={(e) =>
                updateFilters({
                  satellite: e.target.value as "all" | "VIIRS" | "MODIS",
                })
              }
            >
              <option value="all">Todos (VIIRS y MODIS)</option>
              <option value="VIIRS">VIIRS · 375 m</option>
              <option value="MODIS">MODIS · 1 km</option>
            </select>
          </label>
        </section>
        <footer className="municipal-brand">
          <Image src="/brand/municipio.svg" width={42} height={50} alt="" />
          <p>
            Gobierno Autónomo Municipal
            <br />
            de Cochabamba
          </p>
        </footer>
      </aside>
      <div className="map-canvas" ref={mapRef}>
        <MapArtwork
          key={focusId || "map"}
          data={error ? [] : data}
          selected={selected}
          layers={layers}
          zoom={zoom}
          satellite={satellite}
          interactive
          onSelect={setPoint}
          focusedId={focusId}
        />
        <div className="map-summary">
          <Icon name="flame" />
          <div>
            <h4 aria-live="polite">
              {number(error ? 0 : data.length)} focos de calor
            </h4>
            <p>
              {periodLabel(filters)} · {location}
            </p>
          </div>
          <Link href="/estadisticas" className="btn">
            <Icon name="chart" />
            Ver estadísticas
          </Link>
        </div>
        <div className="map-tools">
          <div className="zoom-controls">
            <button
              aria-label="Acercar mapa"
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              disabled={zoom >= 4}
            >
              <Icon name="plus" />
            </button>
            <button
              aria-label="Alejar mapa"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              disabled={zoom <= 0.75}
            >
              <Icon name="minus" />
            </button>
          </div>
          <button
            ref={layerButton}
            aria-label="Capas del mapa"
            aria-expanded={layersOpen}
            aria-controls="map-layers"
            className={layersOpen ? "active" : ""}
            onClick={() => setLayersOpen(!layersOpen)}
          >
            <Icon name="layers" />
          </button>
          <button
            aria-label="Centrar mapa en Cochabamba"
            onClick={() => {
              setZoom(1);
              setFocusId("");
              setPoint(null);
            }}
          >
            <Icon name="target" />
          </button>
          <button
            aria-label="Pantalla completa"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await mapRef.current?.requestFullscreen();
              } catch {
                setZoom(1);
              }
            }}
          >
            <Icon name="expand" />
          </button>
        </div>
        {layersOpen && (
          <section
            id="map-layers"
            className="layers-panel"
            aria-label="Capas del mapa"
          >
            <div className="row">
              <h4>Capas del mapa</h4>
              <button
                className="icon-btn"
                aria-label="Cerrar capas"
                onClick={closeLayers}
              >
                <Icon name="close" />
              </button>
            </div>
            <h3 className="overline">Mapa base</h3>
            <div className="segmented">
              <button
                aria-pressed={!satellite}
                onClick={() => setSatellite(false)}
              >
                Claro
              </button>
              <button
                aria-pressed={satellite}
                onClick={() => setSatellite(true)}
              >
                Satélite
              </button>
            </div>
            <h3 className="overline">Datos</h3>
            {(
              [
                ["hotspots", "Focos de calor"],
                ["boundaries", "Límites municipales"],
                ["protected", "Áreas protegidas"],
                ["territories", "Territorios indígenas (TIOC)"],
                ["forest", "Cobertura de bosque"],
                ["scars", "Cicatrices de quema"],
              ] as [keyof Layers, string][]
            ).map(([key, label]) => (
              <label className="layer-toggle" key={key}>
                {label}
                <input
                  type="checkbox"
                  role="switch"
                  checked={layers[key]}
                  onChange={(e) =>
                    setLayers({ ...layers, [key]: e.target.checked })
                  }
                />
                <span className="switch" aria-hidden="true" />
              </label>
            ))}
            <p className="text-caption muted">
              Las capas se dibujan debajo de los focos. Capas y ubicaciones
              ilustrativas para esta demostración.
            </p>
            {satellite && (
              <p className="text-caption muted">
                Imágenes: Esri World Imagery. Requiere conexión a internet.
              </p>
            )}
          </section>
        )}
        {!error && !data.length && (
          <section className="empty-map">
            <span className="empty-icon">
              <Icon name="search" />
            </span>
            <h4>No hay focos de calor con estos filtros</h4>
            <p>
              No se detectaron focos{" "}
              {filters.municipality
                ? `en ${filters.municipality}`
                : "para esta selección"}{" "}
              en el periodo elegido. Los datos de ejemplo corresponden al 1–14
              de noviembre de 2026.
            </p>
            <div className="row wrap">
              <button className="btn" onClick={() => quick(7)}>
                <Icon name="calendar" />
                Ver últimos 7 días
              </button>
              <button
                className="text-link"
                onClick={() =>
                  updateFilters(
                    filters.municipality
                      ? { municipality: "" }
                      : {
                          province: "",
                          territory: "",
                          protectedArea: "",
                          satellite: "all",
                        },
                  )
                }
              >
                {filters.municipality
                  ? "Quitar filtro de municipio"
                  : "Quitar filtros de ubicación"}
              </button>
            </div>
          </section>
        )}
        {point && data.some((d) => d.id === point.id) && (
          <section className="point-popup" aria-label="Detalle del foco">
            <button
              className="icon-btn"
              aria-label="Cerrar detalle"
              onClick={() => setPoint(null)}
            >
              <Icon name="close" />
            </button>
            <h4>{point.municipality}</h4>
            <p className="muted">
              {point.province} · {point.date}
            </p>
            <p className="mono">
              FRP: {point.frp} MW · {point.satellite}
            </p>
            <p className="text-caption muted">
              Detección de ejemplo · ubicación ilustrativa
            </p>
          </section>
        )}
        <div className="map-legends">
          <section className="heat-legend">
            <h3 className="overline">Potencia del fuego (FRP)</h3>
            {[
              ["Muy baja", "< 5 MW"],
              ["Baja", "5–10 MW"],
              ["Media", "10–25 MW"],
              ["Alta", "25–50 MW"],
              ["Muy alta", "> 50 MW"],
            ].map(([label, value], i) => (
              <div className="legend-row" key={label}>
                <span className={`heat-dot heat-${i + 1}`} />
                {label}
                <span className="mono muted">{value}</span>
              </div>
            ))}
          </section>
          {(layers.protected ||
            layers.territories ||
            layers.forest ||
            layers.scars) && (
            <div className="overlay-legend text-caption">
              Capas ilustrativas{layers.protected && <p>🟩 Áreas protegidas</p>}
              {layers.territories && <p>🟦 Territorios indígenas</p>}
              {layers.forest && <p>╱ Cobertura de bosque</p>}
              {layers.scars && <p>•• Cicatrices de quema</p>}
            </div>
          )}
        </div>
        <div className="map-attribution">
          <span className="scale mono">{Math.round(25 / zoom)} km</span>
          <span className="mono">
            {point
              ? `${point.latitude}, ${point.longitude}`
              : "-17.3935, -66.1570"}
          </span>
          <span>Fuente: NASA FIRMS · ejemplo</span>
        </div>
      </div>
    </main>
  );
}
