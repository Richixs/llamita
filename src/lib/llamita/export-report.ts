import { assertLiveData, csvText, geojson } from "./downloads";
import { ranking, type Detection } from "./data";
import type { ReportConfig } from "./report";

export async function exportReport(
  config: ReportConfig,
  data: Detection[],
): Promise<Blob> {
  assertLiveData(data);
  if (config.format === "CSV")
    return new Blob([csvText(data)], { type: "text/csv;charset=utf-8" });
  if (config.format === "GeoJSON")
    return new Blob([JSON.stringify(geojson(data), null, 2)], {
      type: "application/geo+json",
    });
  if (config.format === "Excel") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const rows = data.map((d) => ({
      Fecha: d.date,
      "Hora UTC-4": d.time,
      Municipio: d.municipality,
      Provincia: d.province,
      "FRP MW": d.frp,
      Latitud: d.latitude,
      Longitud: d.longitude,
      Sensor: d.satellite,
      Origen: "NASA FIRMS",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 24 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Detecciones");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        ranking(data, "municipality").map((m) => ({
          Municipio: m.name,
          Focos: m.count,
        })),
      ),
      "Municipios",
    );
    return new Blob(
      [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );
  }
  if (config.format === "Shapefile") {
    const shp = await import("@mapbox/shp-write");
    return await shp.zip<"blob">(geojson(data), {
      outputType: "blob",
      compression: "STORE",
      folder: "llamita-firms",
      types: { point: "focos" },
    });
  }
  const { exportLivePdf } = await import("./export-live-pdf");
  return exportLivePdf(config, data);
}
