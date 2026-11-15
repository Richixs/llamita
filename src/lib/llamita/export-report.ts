import { csvText, geojson } from "./downloads";
import { byDay, ranking, type Detection } from "./data";
import { dateLabel, number, periodLabel } from "./filters";
import type { ReportConfig } from "./report";
import artwork from "@/lib/map/artwork.json";

export async function exportReport(
  config: ReportConfig,
  data: Detection[],
): Promise<Blob> {
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
      Origen: "Datos de ejemplo",
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
      folder: "llamita-ejemplo",
      types: { point: "focos" },
    });
  }
  return pdf(config, data);
}

async function pdf(config: ReportConfig, data: Detection[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const [displayFont, textFont, monoFont] = await Promise.all([
    fetch("/fonts/space-grotesk-700.ttf").then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar la tipografía del PDF.");
      return r.arrayBuffer();
    }),
    fetch("/fonts/ibm-plex-sans-400.ttf").then((r) => r.arrayBuffer()),
    fetch("/fonts/ibm-plex-mono-400.ttf").then((r) => r.arrayBuffer()),
  ]);
  function register(name: string, buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    doc.addFileToVFS(`${name}.ttf`, btoa(binary));
    doc.addFont(`${name}.ttf`, name, "normal");
  }
  register("Display", displayFont);
  register("Text", textFont);
  register("Mono", monoFont);
  const ink = "#241A16",
    muted = "#6B5A4F",
    orange = "#E4632B",
    border = "#E2D6CA";
  function text(
    value: string,
    x: number,
    y: number,
    size = 10,
    font = "Text",
    color = ink,
    options: { align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) {
    doc.setFont(font);
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(value, x, y, options);
  }
  function rule(y: number) {
    doc.setDrawColor(border);
    doc.setLineWidth(0.25);
    doc.line(13, y, 197, y);
  }
  // Render the original brand and map vectors to images for the downloaded PDF.
  async function rasterize(svg: string, width: number, height: number) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("El navegador no permite dibujar el mapa del PDF.");
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const logoSvg = await fetch("/brand/llamita-logo-para-fondo-claro.svg").then(
    (r) => r.text(),
  );
  const logo = await rasterize(logoSvg, 360, 144);
  function header() {
    doc.addImage(logo, "PNG", 13, 11, 24, 9.6);
    text("REPORTE DE FOCOS DE CALOR", 197, 14, 9, "Mono", muted, {
      align: "right",
    });
    text(
      `Generado el ${new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(new Date())}`,
      197,
      19,
      8,
      "Text",
      muted,
      { align: "right" },
    );
    doc.setDrawColor(orange);
    doc.setLineWidth(0.5);
    doc.line(13, 26, 197, 26);
  }
  header();
  const municipal = ranking(data, "municipality");
  const title =
    config.areaType === "all"
      ? "Focos de calor en Cochabamba"
      : config.areas.length > 1
        ? "Focos de calor en el trópico de Cochabamba"
        : `Focos de calor en ${config.areas[0]}`;
  const titleLines = doc
    .setFont("Display")
    .setFontSize(21)
    .splitTextToSize(title, 184) as string[];
  text(titleLines.join("\n"), 13, 39, 21, "Display");
  let y = 40 + titleLines.length * 7;
  text(periodLabel(config), 13, y, 10, "Text", muted);
  y += 8;
  const areaDescription =
    config.areaType === "all" ? "Todo Cochabamba" : config.areas.join(", ");
  text(areaDescription, 13, y, 9, "Text", muted, { maxWidth: 184 });
  y += 12;
  const include = (s: ReportConfig["sections"][number]) =>
    config.sections.includes(s);
  const days = byDay(
    data,
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  const peak = days.toSorted((a, b) => b.count - a.count)[0];
  if (include("summary")) {
    const metrics = [
      ["FOCOS", number(data.length), "Datos de ejemplo"],
      ["MUNICIPIOS", String(municipal.length), "de 47 en Cochabamba"],
      [
        "ÁREAS PROTEGIDAS",
        number(data.filter((d) => d.protectedArea).length),
        "PN Carrasco y TIPNIS",
      ],
      [
        "DÍA PICO",
        peak?.count ? dateLabel(peak.name, { year: undefined }) : "—",
        `${peak?.count || 0} focos`,
      ],
    ];
    metrics.forEach(([label, value, detail], i) => {
      const x = 13 + i * 47;
      doc.setDrawColor(border);
      doc.line(x, y, x + 43, y);
      text(label, x + 2, y + 6, 8, "Mono", muted);
      text(value, x + 2, y + 15, 19, "Display");
      text(detail, x + 2, y + 22, 7.5, "Text", muted);
      doc.line(x, y + 26, x + 43, y + 26);
    });
    y += 37;
  }
  if (include("map")) {
    text("Mapa de focos", 13, y, 15, "Display");
    y += 4;
    const selected = config.areaType === "municipality" ? config.areas : [];
    const { municipalities, heatColor } = await import("./data");
    const map = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="570 100 720 750" width="1400" height="650" preserveAspectRatio="xMidYMid slice"><rect x="380" y="64" width="1060" height="836" fill="#ECE6DC"/>${municipalities.map((m) => `<path d="${m.d}" fill="${selected.includes(m.name) ? "#FCE9DD" : "#F7F2EA"}" stroke="${selected.includes(m.name) ? orange : "#D6CABB"}"/>`).join("")}<path d="${artwork.outline}" fill="none" stroke="${muted}" stroke-width="1.5"/>${artwork.labels.map((l) => `<path d="${l.d}" fill="${muted}"/>`).join("")}${data.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="3.5" fill="${heatColor(d.frp)}" stroke="white"/>`).join("")}</svg>`;
    const png = await rasterize(map, 1400, 650);
    doc.addImage(png, "PNG", 13, y, 184, 80);
    y += 85;
    text("FRP:", 13, y, 8, "Text", muted);
    const labels = ["< 5", "5–10", "10–25", "25–50", "> 50 MW"];
    const colors = ["#FFE3A3", "#F7B24A", orange, "#C2361C", "#7A1A10"];
    labels.forEach((label, i) => {
      doc.setFillColor(colors[i]);
      doc.circle(25 + i * 22, y - 1, 1.1, "F");
      text(label, 28 + i * 22, y, 8, "Text", muted);
    });
    y += 13;
  }
  function daily(x: number, startY: number, width: number, height: number) {
    text("Focos por día", x, startY, 15, "Display");
    const chartY = startY + 8;
    const max = Math.max(1, ...days.map((d) => d.count));
    const ceiling = Math.ceil(max / 50) * 50;
    const cell = (width - 8) / Math.max(1, days.length);
    for (let i = 0; i < 4; i++) {
      const lineY = chartY + (height * i) / 3;
      doc.setDrawColor(border);
      doc.line(x + 7, lineY, x + width, lineY);
      text(
        String(Math.round((ceiling * (3 - i)) / 3)),
        x,
        lineY + 1,
        6,
        "Mono",
        muted,
      );
    }
    days.forEach((d, i) => {
      const h = (d.count / ceiling) * height;
      doc.setFillColor(d.count === max ? orange : muted);
      doc.rect(x + 8 + i * cell, chartY + height - h, cell * 0.6, h, "F");
      if (days.length <= 31)
        text(
          String(Number(d.name.slice(-2))),
          x + 8 + i * cell + cell * 0.3,
          chartY + height + 5,
          6,
          "Mono",
          muted,
          { align: "center" },
        );
    });
  }
  if (include("daily")) daily(13, y, include("ranking") ? 86 : 184, 37);
  if (include("ranking")) {
    const x = include("daily") ? 108 : 13,
      width = include("daily") ? 89 : 184;
    text("Por municipio", x, y, 15, "Display");
    let rowY = y + 9;
    doc.setFillColor("#F3EBE2");
    doc.rect(x, rowY - 4, width, 7, "F");
    text("MUNICIPIO", x + 2, rowY, 7, "Mono", muted);
    text("FOCOS", x + width - 20, rowY, 7, "Mono", muted);
    text("%", x + width - 2, rowY, 7, "Mono", muted, { align: "right" });
    rowY += 8;
    municipal.slice(0, 5).forEach((m) => {
      text(m.name, x + 2, rowY, 8);
      text(String(m.count), x + width - 14, rowY, 8, "Mono", ink, {
        align: "right",
      });
      text(
        `${((m.count / data.length) * 100).toFixed(1)} %`,
        x + width - 2,
        rowY,
        7,
        "Mono",
        ink,
        { align: "right" },
      );
      doc.setDrawColor(border);
      doc.line(x, rowY + 3, x + width, rowY + 3);
      rowY += 8;
    });
    if (municipal.length > 5) {
      text("Otros municipios", x + 2, rowY, 8);
      text(
        String(municipal.slice(5).reduce((s, m) => s + m.count, 0)),
        x + width - 14,
        rowY,
        8,
        "Mono",
        ink,
        { align: "right" },
      );
      rowY += 8;
    }
    text("Total", x + 2, rowY, 8, "Display");
    text(String(data.length), x + width - 14, rowY, 8, "Mono", ink, {
      align: "right",
    });
    text("100 %", x + width - 2, rowY, 7, "Mono", ink, { align: "right" });
  }
  if (include("protected")) {
    doc.addPage();
    header();
    text("Focos en áreas protegidas", 13, 40, 21, "Display");
    text(periodLabel(config), 13, 49, 10, "Text", muted);
    const areas = ranking(data, "protectedArea");
    areas.forEach((a, i) => {
      const rowY = 65 + i * 14;
      text(a.name, 13, rowY, 11);
      text(`${a.count} focos`, 197, rowY, 11, "Mono", ink, { align: "right" });
      rule(rowY + 5);
    });
    text("Cómo interpretar este reporte", 13, 125, 16, "Display");
    text(
      "Un foco de calor indica una anomalía térmica. No confirma por sí solo un incendio forestal. La nubosidad, la resolución y el paso del satélite pueden afectar las detecciones.",
      13,
      137,
      11,
      "Text",
      muted,
      { maxWidth: 184 },
    );
    text("Fuentes y alcance", 13, 170, 16, "Display");
    text(
      "NASA FIRMS integra observaciones VIIRS y MODIS. Las horas se muestran en hora de Bolivia (UTC−4). Este reporte contiene datos de ejemplo: los límites y las coordenadas son ilustrativos.",
      13,
      182,
      11,
      "Text",
      muted,
      { maxWidth: 184 },
    );
  }
  if (include("table")) {
    for (let offset = 0; offset < data.length; offset += 28) {
      doc.addPage();
      header();
      text("Detecciones del periodo", 13, 39, 18, "Display");
      text("Fecha / hora", 13, 49, 8, "Mono", muted);
      text("Municipio", 65, 49, 8, "Mono", muted);
      text("FRP", 119, 49, 8, "Mono", muted);
      text("Coordenadas", 137, 49, 8, "Mono", muted);
      data.slice(offset, offset + 28).forEach((d, i) => {
        const rowY = 58 + i * 7;
        text(`${d.date} ${d.time}`, 13, rowY, 8, "Mono");
        text(d.municipality, 65, rowY, 8);
        text(String(d.frp), 119, rowY, 8, "Mono");
        text(`${d.latitude}, ${d.longitude}`, 137, rowY, 7, "Mono");
        rule(rowY + 2);
      });
    }
  }
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    rule(278);
    text(
      "Fuente: NASA FIRMS · VIIRS y MODIS. Datos de ejemplo procesados por Llamita.",
      13,
      284,
      8,
      "Text",
      muted,
    );
    text(
      "Ubicaciones ilustrativas. Un foco de calor debe verificarse en campo.",
      13,
      289,
      8,
      "Text",
      muted,
    );
    text(
      `Página ${p} de ${doc.getNumberOfPages()}`,
      197,
      284,
      8,
      "Mono",
      muted,
      { align: "right" },
    );
  }
  doc.setProperties({
    title: "Llamita · Reporte de focos de calor (ejemplo)",
    author: "Llamita",
    subject: "Datos ilustrativos de Cochabamba",
  });
  return doc.output("blob");
}
