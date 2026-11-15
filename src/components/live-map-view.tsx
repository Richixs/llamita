"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { DataNotice } from "./data-mode-control";
import { Icon } from "./icon";
import {
  WORLD_BBOX,
  GAMC_LAYERS,
  MAX_QUERY_DAYS,
  type GamcLayerId,
} from "@/lib/geo/catalog";
import { dateOffset, number, periodLabel } from "@/lib/llamita/filters";
import { GeographicScopeControl } from "./geographic-scope-control";
import { boundaryBbox } from "@/lib/geo/geojson-bbox";
import {
  COCHABAMBA_MUNICIPALITIES,
  COCHABAMBA_PROVINCES,
  MUNICIPALITIES_BY_PROVINCE,
} from "@/lib/geo/names";
import type { Detection } from "@/lib/llamita/data";
import type { FeatureInfo, MapApi } from "./geographic-map";
import "./map.css";
import "./live-map.css";
const GeographicMap = dynamic(() => import("./geographic-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Preparando mapa geográfico…
    </div>
  ),
});
export function LiveMapView({ initialFocus = "" }: { initialFocus?: string }) {
  const {
    filters,
    updateFilters,
    resetFilters,
    data,
    loading,
    error,
    bbox,
    setBbox,
    today,
  } = useApp();
  const [activeLayers, setActiveLayers] = useState<GamcLayerId[]>([]);
  const [layersOpen, setLayersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [point, setPoint] = useState<Detection | null>(null);
  const [dismissedFocus, setDismissedFocus] = useState(false);
  const [features, setFeatures] = useState<FeatureInfo[] | null>(null);
  const [layerErrors, setLayerErrors] = useState<string[]>([]);
  const [selectedBoundary, setSelectedBoundary] = useState<GeoJSON.Feature<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > | null>(null);
  const apiRef = useRef<MapApi | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const type = filters.municipality
      ? "municipality"
      : filters.province
        ? "province"
        : null;
    const name = filters.municipality || filters.province;
    const controller = new AbortController();
    (async () => {
      if (!type || !name) {
        setSelectedBoundary(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/geo/boundary?type=${type}&name=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );
        const feature = res.ok ? await res.json() : null;
        setSelectedBoundary(feature);
        // The query area follows the selection, so it never silently stays
        // pointed at a bbox (e.g. "Cobertura municipal GAMC") that excludes
        // the province/municipio the user just picked.
        if (feature) setBbox(boundaryBbox(feature));
      } catch {
        if (!controller.signal.aborted) setSelectedBoundary(null);
      }
    })();
    return () => controller.abort();
  }, [filters.province, filters.municipality, setBbox]);
  const onLayerError = useCallback(
    (name: string) =>
      setLayerErrors((current) =>
        current.includes(name) ? current : [...current, name],
      ),
    [],
  );
  const rangeDays = Math.round(
    (Date.parse(filters.to) - Date.parse(filters.from)) / 86400000,
  );
  const selectedPoint =
    point && data.some((d) => d.id === point.id)
      ? point
      : dismissedFocus
        ? undefined
        : data.find((d) => d.id === initialFocus);
  function quick(days: number, yesterday = false) {
    const to = dateOffset(today, yesterday ? -1 : 0);
    updateFilters({
      mode: days === 1 ? "day" : "range",
      from: dateOffset(to, 1 - days),
      to,
    });
  }
  return (
    <main id="contenido" className="map-page live-map-page">
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
        aria-label="Filtros de datos reales"
      >
        <div className="filters-heading row">
          <h4>Filtros</h4>
          <button
            className="text-link"
            onClick={() => {
              resetFilters();
              setActiveLayers([]);
              setFeatures(null);
              setLayerErrors([]);
              setPoint(null);
              setBbox(WORLD_BBOX);
            }}
          >
            Limpiar todo
          </button>
        </div>
        <section className="filter-group">
          <h2 className="overline">Fecha · hora de Bolivia</h2>
          <div className="segmented">
            <button
              aria-pressed={filters.mode === "day"}
              onClick={() => updateFilters({ mode: "day" })}
            >
              Un día
            </button>
            <button
              aria-pressed={filters.mode === "range"}
              onClick={() =>
                updateFilters({
                  mode: "range",
                  from: dateOffset(filters.to, -6),
                })
              }
            >
              Rango
            </button>
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
                max={today}
                onChange={(e) => updateFilters({ to: e.target.value })}
              />
            </label>
          </div>
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
                onClick={() => quick(Number(days), label === "Ayer")}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-caption muted">
            Hasta {MAX_QUERY_DAYS} días por consulta. La disponibilidad depende
            del producto de NASA.
          </p>
          {rangeDays > 60 && (
            <p className="text-caption muted" role="status">
              Rango amplio ({number(rangeDays)} días): la consulta puede tardar
              varios segundos.
            </p>
          )}
        </section>
        <section className="filter-group">
          <h2 className="overline">Área de consulta</h2>
          <GeographicScopeControl
            continent={filters.continent}
            country={filters.country}
            local={filters.local}
            onChange={({ continent, country, bbox, local }) => {
              updateFilters({
                continent,
                country,
                local,
                province: "",
                municipality: "",
              });
              setActiveLayers([]);
              setFeatures(null);
              setLayerErrors([]);
              setBbox(bbox);
              setPoint(null);
            }}
          />
          <p className="text-caption muted">
            {filters.country
              ? "Consulta recortada al país seleccionado."
              : filters.continent
                ? `Cobertura de ${filters.continent}.`
                : "Cobertura mundial de VIIRS y MODIS."}
          </p>
          <button
            className="btn"
            onClick={() => {
              const visible = apiRef.current?.getBbox();
              if (visible) setBbox(visible);
            }}
          >
            <Icon name="target" />
            Consultar esta vista
          </button>
          <p className="text-caption muted">
            Mueve el mapa y consulta la vista para explorar cualquier región del
            mundo.
          </p>
          {filters.local && (
            <fieldset className="unavailable-filters">
              <legend className="overline">Cochabamba · reto local</legend>
              <label className="field">
                Provincia
                <select
                  aria-label="Filtrar por provincia"
                  value={filters.province}
                  onChange={(e) => {
                    const province = e.target.value;
                    const allowed = province
                      ? (MUNICIPALITIES_BY_PROVINCE[province] ?? [])
                      : COCHABAMBA_MUNICIPALITIES;
                    updateFilters({
                      country: "BOL",
                      continent: "América del Sur",
                      province,
                      municipality: allowed.includes(filters.municipality)
                        ? filters.municipality
                        : "",
                    });
                  }}
                >
                  <option value="">Todas</option>
                  {COCHABAMBA_PROVINCES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Municipio
                <select
                  aria-label="Filtrar por municipio"
                  value={filters.municipality}
                  onChange={(e) =>
                    updateFilters({
                      country: "BOL",
                      continent: "América del Sur",
                      municipality: e.target.value,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {(filters.province
                    ? (MUNICIPALITIES_BY_PROVINCE[filters.province] ?? [])
                    : COCHABAMBA_MUNICIPALITIES
                  ).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                TCO / áreas protegidas
                <input placeholder="Fuente pendiente" disabled />
              </label>
            </fieldset>
          )}
        </section>
        <section className="filter-group">
          <h2 className="overline">Satélite</h2>
          <label className="field">
            Sensor
            <select
              aria-label="Sensor satelital"
              value={filters.satellite}
              onChange={(e) =>
                updateFilters({
                  satellite: e.target.value as "all" | "VIIRS" | "MODIS",
                })
              }
            >
              <option value="all">VIIRS y MODIS</option>
              <option value="VIIRS">VIIRS · S-NPP, NOAA-20, NOAA-21</option>
              <option value="MODIS">MODIS · Aqua y Terra</option>
            </select>
          </label>
        </section>
        <DataNotice />
      </aside>
      <div className="map-canvas live-map-canvas" ref={canvasRef}>
        <GeographicMap
          data={data}
          bbox={bbox}
          activeLayers={activeLayers}
          satellite={satellite}
          showHotspots={showHotspots}
          focusId={initialFocus}
          onPoint={setPoint}
          onFeatures={setFeatures}
          onLayerError={onLayerError}
          apiRef={apiRef}
          selectedBoundary={selectedBoundary}
        />
        <div className="map-summary">
          <Icon name="flame" />
          <div>
            <h4 aria-live="polite">
              {loading
                ? "Consultando…"
                : error
                  ? "Consulta no disponible"
                  : `${number(data.length)} focos de calor`}
            </h4>
            <p>{periodLabel(filters)} · área consultada</p>
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
              onClick={() => apiRef.current?.zoomIn()}
            >
              <Icon name="plus" />
            </button>
            <button
              aria-label="Alejar mapa"
              onClick={() => apiRef.current?.zoomOut()}
            >
              <Icon name="minus" />
            </button>
          </div>
          <button
            aria-label="Capas del mapa"
            className={layersOpen ? "active" : ""}
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen(!layersOpen)}
          >
            <Icon name="layers" />
          </button>
          <button
            aria-label="Centrar área consultada"
            onClick={() => apiRef.current?.fit(bbox)}
          >
            <Icon name="target" />
          </button>
          <button
            aria-label="Pantalla completa"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await canvasRef.current?.requestFullscreen();
              } catch {
                onLayerError(
                  "Pantalla completa no disponible en este navegador",
                );
              }
            }}
          >
            <Icon name="expand" />
          </button>
        </div>
        {layersOpen && (
          <section
            className="layers-panel live-layers"
            aria-label="Capas del mapa"
            onKeyDown={(e) => {
              if (e.key === "Escape") setLayersOpen(false);
            }}
          >
            <div className="row">
              <h4>Capas del mapa</h4>
              <button
                className="icon-btn"
                aria-label="Cerrar capas"
                onClick={() => setLayersOpen(false)}
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
            <h3 className="overline">NASA FIRMS</h3>
            <label className="layer-toggle">
              Focos de calor
              <input
                role="switch"
                type="checkbox"
                checked={showHotspots}
                onChange={(e) => setShowHotspots(e.target.checked)}
              />
              <span className="switch" aria-hidden />
            </label>
            {filters.local && (
              <>
                <h3 className="overline">
                  Reto local · servicios municipales GAMC
                </h3>
                {GAMC_LAYERS.map((layer) => (
                  <div className="municipal-layer" key={layer.id}>
                    <label className="layer-toggle">
                      {layer.name}
                      <input
                        type="checkbox"
                        role="switch"
                        checked={activeLayers.includes(layer.id)}
                        onChange={(e) => {
                          setActiveLayers((ids) =>
                            e.target.checked
                              ? [...ids, layer.id]
                              : ids.filter((id) => id !== layer.id),
                          );
                          setLayerErrors((errors) =>
                            errors.filter((name) => name !== layer.name),
                          );
                          setFeatures(null);
                        }}
                      />
                      <span className="switch" aria-hidden />
                    </label>
                    <button
                      className="text-link text-caption"
                      onClick={() => apiRef.current?.fit(layer.bbox)}
                    >
                      <Icon name="target" />
                      Ver cobertura
                    </button>
                    {activeLayers.includes(layer.id) && (
                      <Image
                        width={240}
                        height={180}
                        unoptimized
                        className="wms-legend"
                        src={`/api/gamc/wms?layer=${layer.id}&REQUEST=GetLegendGraphic&VERSION=1.0.0`}
                        alt={`Leyenda de ${layer.name}`}
                        onError={() => onLayerError(layer.name)}
                      />
                    )}
                  </div>
                ))}
                <p className="text-caption muted">
                  Activa una capa y haz clic en el mapa para consultar sus
                  atributos. Los estilos se conservan tal como los publica GAMC.
                </p>
              </>
            )}
            {layerErrors.length > 0 && (
              <p role="alert" className="text-caption form-error">
                No se pudo cargar: {layerErrors.join(", ")}. Comprueba la
                configuración y la conexión del servicio.
              </p>
            )}
          </section>
        )}
        {selectedPoint && (
          <section
            className="point-popup live-point"
            aria-label="Detalle de detección"
          >
            <button
              className="icon-btn"
              aria-label="Cerrar detalle"
              onClick={() => {
                setPoint(null);
                setDismissedFocus(true);
                if (initialFocus) window.history.replaceState(null, "", "/");
              }}
            >
              <Icon name="close" />
            </button>
            <h4>{selectedPoint.satellite}</h4>
            <p className="mono">{selectedPoint.frp} MW</p>
            <p>
              {selectedPoint.date} · {selectedPoint.time} (UTC−4)
            </p>
            <p className="mono">
              {selectedPoint.latitude}, {selectedPoint.longitude}
            </p>
            <p className="text-caption muted">
              Fuente: NASA FIRMS · {selectedPoint.source}
            </p>
          </section>
        )}
        {features && (
          <section
            className="feature-info panel"
            aria-label="Atributos de las capas"
          >
            <div className="row">
              <h4>Información del punto</h4>
              <button
                className="icon-btn"
                aria-label="Cerrar atributos"
                onClick={() => setFeatures(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            {features.map((result) => (
              <section key={result.layer}>
                <strong>{result.layer}</strong>
                {result.error ? (
                  <p className="form-error">{result.error}</p>
                ) : !result.features.length ? (
                  <p>Sin datos en este punto.</p>
                ) : (
                  result.features.map((feature, i) => (
                    <dl key={i}>
                      {Object.entries(feature.properties || {}).map(
                        ([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value ?? "—")}
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  ))
                )}
              </section>
            ))}
          </section>
        )}
        {!loading && !error && !data.length && (
          <p className="map-empty-message" role="status">
            No se encontraron detecciones en el área y periodo consultados.
          </p>
        )}
        <div className="live-frp-legend">
          <span className="overline">FRP (MW)</span>
          {[
            ["< 5", 1],
            ["5–10", 2],
            ["10–25", 3],
            ["25–50", 4],
            ["> 50", 5],
          ].map(([label, i]) => (
            <span key={label}>
              <i style={{ background: `var(--color-calor-${i})` }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
