"use client";
import { useApp } from "./app-provider";
export function DataNotice() {
  const { loading, error, warnings, reload, progress, cancel, cancelled } =
    useApp();
  return (
    <div className="data-notices">
      {loading && (
        <p className="notice" role="status">
          Consultando detecciones de NASA FIRMS…{" "}
          {progress.total > 1 &&
            `Bloque ${progress.completed} de ${progress.total}`}
        </p>
      )}
      {loading && (
        <button className="text-link" onClick={cancel}>
          Cancelar consulta
        </button>
      )}
      {cancelled && (
        <p className="notice" role="status">
          Consulta cancelada.{" "}
          <button className="text-link" onClick={reload}>
            Reanudar consulta
          </button>
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
        Cobertura mundial VIIRS y MODIS. Los países se asignan con límites de
        Natural Earth; las costas e islas pequeñas pueden quedar sin asignar.
        Las provincias y municipios están disponibles para el reto local de
        Cochabamba. Fechas y horas en UTC−4.
      </p>
    </div>
  );
}
