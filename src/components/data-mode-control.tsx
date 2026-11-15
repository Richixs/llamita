"use client";
import { useApp } from "./app-provider";
export function DataModeControl() {
  const { mode, setMode } = useApp();
  return (
    <div
      className="segmented data-mode"
      role="group"
      aria-label="Origen de los datos"
    >
      <button aria-pressed={mode === "live"} onClick={() => setMode("live")}>
        Datos reales
      </button>
      <button aria-pressed={mode === "demo"} onClick={() => setMode("demo")}>
        Ejemplo
      </button>
    </div>
  );
}
export function DataNotice() {
  const { mode, loading, error, warnings, reload } = useApp();
  if (mode === "demo")
    return (
      <p className="notice">
        Datos de ejemplo · noviembre de 2026. Las ubicaciones y capas de este
        modo son ilustrativas.
      </p>
    );
  return (
    <div className="data-notices">
      {loading && (
        <p className="notice" role="status">
          Consultando detecciones de NASA FIRMS…
        </p>
      )}
      {error && (
        <div className="notice error-notice" role="alert">
          {error}{" "}
          <button className="text-link" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && warnings.length > 0 && (
        <details className="notice">
          <summary>Disponibilidad de datos ({warnings.length} avisos)</summary>
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </details>
      )}
      <p className="text-caption muted">
        Consulta por rectángulo geográfico. Las detecciones aún no están
        asignadas a municipios, provincias, TCO o áreas protegidas.
        Observaciones de distintos satélites pueden coincidir en un mismo
        incendio.
      </p>
    </div>
  );
}
