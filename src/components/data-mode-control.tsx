"use client";
import { useApp } from "./app-provider";
export function DataNotice() {
  const { loading, error, warnings, reload } = useApp();
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
