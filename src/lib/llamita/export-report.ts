import { assertLiveData, csvText, geojson } from "./downloads";
import { type Detection } from "./data";
import { exportSheets } from "./export-data";
import { reportData, type ReportConfig } from "./report";

export async function exportReport(
  config: ReportConfig,
  data: Detection[],
): Promise<Blob> {
  assertLiveData(data);
  data = reportData(config, data);
  if (config.format === "CSV")
    return new Blob([csvText(data)], { type: "text/csv;charset=utf-8" });
  if (config.format === "GeoJSON")
    return new Blob([JSON.stringify(geojson(data), null, 2)], {
      type: "application/geo+json",
    });
  if (config.format === "Excel") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    for (const { name, rows } of exportSheets(data)) {
      // Excel has 1,048,576 rows per sheet, including the header.
      for (
        let offset = 0;
        offset < Math.max(1, rows.length);
        offset += 1048575
      ) {
        const suffix =
          rows.length > 1048575 ? ` ${Math.floor(offset / 1048575) + 1}` : "";
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(rows.slice(offset, offset + 1048575)),
          name + suffix,
        );
      }
    }
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
