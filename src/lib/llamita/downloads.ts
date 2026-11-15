import type { Detection } from "./data";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function csvText(data: Detection[]) {
  const cell = (v: string | number) =>
    `"${String(typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replaceAll('"', '""')}"`;
  const rows = data.map((d) => [
    d.date,
    d.time,
    d.municipality,
    d.province,
    d.frp,
    d.latitude,
    d.longitude,
    d.satellite,
    "DATOS DE EJEMPLO",
  ]);
  return (
    "\uFEFF" +
    [
      [
        "Fecha",
        "Hora (UTC-4)",
        "Municipio",
        "Provincia",
        "FRP (MW)",
        "Latitud",
        "Longitud",
        "Sensor",
        "Origen",
      ],
      ...rows,
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n")
  );
}
export function downloadCsv(data: Detection[]) {
  saveBlob(
    new Blob([csvText(data)], { type: "text/csv;charset=utf-8" }),
    "llamita-focos-ejemplo.csv",
  );
}
export function geojson(data: Detection[]) {
  return {
    type: "FeatureCollection" as const,
    features: data.map((d) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [d.longitude, d.latitude],
      },
      properties: {
        municipio: d.municipality,
        provincia: d.province,
        fecha: d.date,
        hora: d.time,
        frp_mw: d.frp,
        sensor: d.satellite,
        ejemplo: true,
      },
    })),
  };
}
