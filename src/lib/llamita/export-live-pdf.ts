import type { Detection } from "./data";
import { byDay } from "./data";
import { periodLabel } from "./filters";
import type { ReportConfig } from "./report";
import { GAMC_BBOX } from "@/lib/geo/catalog";
import { geographicSnapshot, svgPng } from "@/lib/geo/snapshot";
export async function exportLivePdf(config: ReportConfig, data: Detection[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  for (const [font, file] of [
    ["Text", "ibm-plex-sans-400.ttf"],
    ["Display", "space-grotesk-700.ttf"],
    ["Mono", "ibm-plex-mono-400.ttf"],
  ]) {
    const response = await fetch(`/fonts/${file}`);
    if (!response.ok)
      throw new Error("No se pudieron cargar las fuentes del PDF.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    doc.addFileToVFS(file, btoa(binary));
    doc.addFont(file, font, "normal");
  }
  const logo = await svgPng(
    await fetch("/brand/llamita-logo-para-fondo-claro.svg").then((r) =>
      r.text(),
    ),
    360,
    144,
  );
  const ink = "#241A16",
    muted = "#6B5A4F",
    border = "#E2D6CA";
  function text(
    value: string,
    x: number,
    y: number,
    size = 10,
    font = "Text",
    color = ink,
    maxWidth?: number,
  ) {
    doc.setFont(font);
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(value, x, y, maxWidth ? { maxWidth } : {});
  }
  function header() {
    doc.addImage(logo, "PNG", 13, 11, 24, 9.6);
    text("NASA FIRMS · DATOS REALES", 117, 15, 9, "Mono", muted);
    text(
      new Date().toLocaleString("es-BO", { timeZone: "America/La_Paz" }),
      117,
      21,
      8,
      "Text",
      muted,
    );
    doc.setDrawColor("#E4632B");
    doc.line(13, 26, 197, 26);
  }
  header();
  text("Focos de calor en el área consultada", 13, 39, 21, "Display");
  text(periodLabel(config), 13, 48, 10, "Text", muted);
  const bbox = config.bbox || GAMC_BBOX;
  text(`BBOX: ${bbox.join(", ")}`, 13, 55, 8, "Mono", muted);
  let y = 67;
  if (config.sections.includes("summary")) {
    const metrics = [
      ["DETECCIONES", String(data.length)],
      ["VIIRS", String(data.filter((d) => d.satellite === "VIIRS").length)],
      ["MODIS", String(data.filter((d) => d.satellite === "MODIS").length)],
      ["FRP MÁXIMO", `${Math.max(0, ...data.map((d) => d.frp)).toFixed(1)} MW`],
    ];
    metrics.forEach(([label, value], i) => {
      const x = 13 + i * 47;
      doc.setDrawColor(border);
      doc.line(x, y, x + 43, y);
      text(label, x + 2, y + 6, 8, "Mono", muted);
      text(value, x + 2, y + 16, 18, "Display");
      doc.line(x, y + 22, x + 43, y + 22);
    });
    y += 33;
  }
  if (config.sections.includes("map")) {
    text("Distribución geográfica", 13, y, 15, "Display");
    y += 5;
    doc.addImage(
      await svgPng(geographicSnapshot(data, bbox, 1400, 620), 1400, 620),
      "PNG",
      13,
      y,
      184,
      82,
    );
    y += 88;
    text(
      "Coordenadas reales · Web Mercator · sin polígonos administrativos",
      13,
      y,
      8,
      "Text",
      muted,
    );
    y += 12;
  }
  if (config.sections.includes("daily")) {
    text("Focos por día", 13, y, 15, "Display");
    y += 7;
    const days = byDay(
        data,
        config.mode === "day" ? config.to : config.from,
        config.to,
      ),
      max = Math.max(1, ...days.map((d) => d.count)),
      cell = 180 / Math.max(1, days.length);
    for (let i = 0; i < 4; i++) {
      doc.setDrawColor(border);
      doc.line(17, y + (38 * i) / 3, 197, y + (38 * i) / 3);
    }
    days.forEach((d, i) => {
      const height = (d.count / max) * 38;
      doc.setFillColor(d.count === max ? "#E4632B" : muted);
      doc.rect(17 + i * cell, y + 38 - height, cell * 0.6, height, "F");
      text(
        String(Number(d.name.slice(-2))),
        17 + i * cell,
        y + 43,
        6,
        "Mono",
        muted,
      );
    });
    y += 53;
  }
  text(
    "Las observaciones de distintos sensores pueden coincidir en un mismo incendio. No se calculan totales administrativos sin límites oficiales.",
    13,
    Math.min(y, 255),
    9,
    "Text",
    muted,
    184,
  );
  if (config.warnings?.length) {
    text(
      "Consulta las páginas de disponibilidad antes de interpretar los totales.",
      13,
      271,
      7,
      "Text",
      muted,
    );
    for (let offset = 0; offset < config.warnings.length; offset += 8) {
      doc.addPage();
      header();
      text("Disponibilidad de los datos", 13, 40, 19, "Display");
      text(periodLabel(config), 13, 49, 10, "Text", muted);
      let warningY = 63;
      for (const warning of config.warnings.slice(offset, offset + 8)) {
        doc.setFont("Text");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(warning, 180) as string[];
        text(lines.join("\n"), 13, warningY, 10, "Text", muted);
        warningY += lines.length * 5 + 8;
      }
    }
  }
  if (config.sections.includes("table"))
    for (let offset = 0; offset < data.length; offset += 28) {
      doc.addPage();
      header();
      text("Detecciones del periodo", 13, 39, 18, "Display");
      text("Fecha / hora (UTC−4)", 13, 49, 8, "Mono", muted);
      text("Sensor", 68, 49, 8, "Mono", muted);
      text("FRP MW", 105, 49, 8, "Mono", muted);
      text("Coordenadas", 132, 49, 8, "Mono", muted);
      data.slice(offset, offset + 28).forEach((d, i) => {
        const rowY = 58 + i * 7;
        text(`${d.date} ${d.time}`, 13, rowY, 8, "Mono");
        text(d.satellite, 68, rowY, 8);
        text(String(d.frp), 105, rowY, 8, "Mono");
        text(`${d.latitude}, ${d.longitude}`, 132, rowY, 7, "Mono");
        doc.setDrawColor(border);
        doc.line(13, rowY + 2, 197, rowY + 2);
      });
    }
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setDrawColor(border);
    doc.line(13, 277, 197, 277);
    text(
      "Fuente: NASA FIRMS · VIIRS y MODIS. Detecciones reales por rectángulo geográfico.",
      13,
      283,
      8,
      "Text",
      muted,
    );
    text(
      "Hora de Bolivia (UTC−4). Un foco de calor debe verificarse en campo.",
      13,
      288,
      8,
      "Text",
      muted,
    );
    text(
      `Página ${p} de ${doc.getNumberOfPages()}`,
      170,
      293,
      7,
      "Mono",
      muted,
    );
  }
  doc.setProperties({
    title: "Llamita · Detecciones reales NASA FIRMS",
    author: "Llamita",
    subject: `NASA FIRMS · ${periodLabel(config)} · BBOX ${bbox.join(",")}${config.warnings?.length ? " · " + config.warnings.join(" ") : ""}`,
  });
  return doc.output("blob");
}
