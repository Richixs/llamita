import type { Detection } from "./data";
import { byDay } from "./data";
import { reportRankings } from "./report-model";
export function detectionRow(d: Detection) {
  return {
    Fecha: d.date,
    "Hora UTC-4": d.time,
    País: d.country || "Sin asignar",
    Municipio: d.municipality,
    Provincia: d.province,
    "FRP MW": d.frp,
    Latitud: d.latitude,
    Longitud: d.longitude,
    Sensor: d.satellite,
    Producto: d.source || "",
    Origen: "NASA FIRMS",
  };
}
export function exportSheets(
  data: Detection[],
  limit?: number,
): { name: string; rows: Record<string, string | number>[] }[] {
  const ranks = reportRankings(data);
  return [
    {
      name: "Detecciones",
      rows: (limit === undefined ? data : data.slice(0, limit)).map(
        detectionRow,
      ),
    },
    {
      name: "Países",
      rows: ranks.countries.map((v) => ({ País: v.name, Focos: v.count })),
    },
    {
      name: "Sensores",
      rows: ranks.sensors.map((v) => ({ Sensor: v.name, Focos: v.count })),
    },
    {
      name: "Municipios",
      rows: ranks.municipalities.map((v) => ({
        Municipio: v.name,
        Focos: v.count,
      })),
    },
    {
      name: "Provincias",
      rows: ranks.provinces.map((v) => ({ Provincia: v.name, Focos: v.count })),
    },
    {
      name: "Por día",
      rows: data.length
        ? byDay(
            data,
            data.reduce(
              (min, d) => (d.date < min ? d.date : min),
              data[0].date,
            ),
            data.reduce(
              (max, d) => (d.date > max ? d.date : max),
              data[0].date,
            ),
          ).map((v) => ({ Fecha: v.name, Focos: v.count }))
        : [],
    },
  ];
}
