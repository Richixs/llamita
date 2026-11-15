import { scopeLabel } from "@/lib/geo/scope";
import type { Detection } from "./data";
import {
  reportPlan,
  reportRankings,
  reportTimeline,
  maxFrp,
} from "./report-model";
import { periodLabel } from "./filters";
import type { ReportConfig } from "./report";
import { WORLD_BBOX } from "@/lib/geo/catalog";
import { geographicMapSnapshot, svgPng } from "@/lib/geo/snapshot";
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
  const bbox = config.bbox || WORLD_BBOX;
  const ranks = reportRankings(data);
  const timeline = reportTimeline(
    data,
    config.mode === "day" ? config.to : config.from,
    config.to,
  );
  const pages = reportPlan(config, data);
  function bars(
    title: string,
    values: { name: string; count: number }[],
    startY: number,
    x = 13,
    width = 184,
  ) {
    text(title, x, startY, 14, "Display");
    const max = values.reduce((m, v) => Math.max(m, v.count), 1);
    values.forEach((v, i) => {
      const y = startY + 10 + i * 8;
      text(
        v.name.length > 29 ? v.name.slice(0, 28) + "…" : v.name,
        x,
        y,
        8,
        "Text",
        ink,
      );
      doc.setFillColor(i === 0 ? "#E4632B" : muted);
      doc.rect(
        x + width * 0.47,
        y - 3,
        Math.max(0.3, (v.count / max) * width * 0.36),
        3,
        "F",
      );
      text(String(v.count), x + width * 0.86, y, 8, "Mono");
    });
  }
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    if (pageIndex) doc.addPage();
    header();
    const page = pages[pageIndex];
    if (page.kind === "overview") {
      text(`Focos de calor · ${scopeLabel(config)}`, 13, 39, 20, "Display");
      text(periodLabel(config), 13, 48, 10, "Text", muted);
      text(`BBOX: ${bbox.join(", ")}`, 13, 55, 8, "Mono", muted);
      let y = 67;
      if (config.sections.includes("summary")) {
        const metrics = [
          ["DETECCIONES", String(data.length)],
          [
            "PAÍSES",
            String(
              ranks.countries.filter((v) => v.name !== "Sin asignar").length,
            ),
          ],
          [
            "VIIRS / MODIS",
            `${data.filter((d) => d.satellite === "VIIRS").length} / ${data.filter((d) => d.satellite === "MODIS").length}`,
          ],
          ["FRP MÁXIMO", `${maxFrp(data).toFixed(1)} MW`],
        ];
        metrics.forEach(([label, value], i) => {
          const x = 13 + i * 47;
          doc.setDrawColor(border);
          doc.line(x, y, x + 43, y);
          text(label, x + 2, y + 6, 8, "Mono", muted);
          text(value, x + 2, y + 16, 14, "Display");
          doc.line(x, y + 22, x + 43, y + 22);
        });
        y += 33;
      }
      if (config.sections.includes("map")) {
        text("Distribución geográfica", 13, y, 15, "Display");
        y += 5;
        doc.addImage(
          await svgPng(
            await geographicMapSnapshot(data, bbox, 1400, 620),
            1400,
            620,
          ),
          "PNG",
          13,
          y,
          184,
          82,
        );
        y += 94;
      }
      if (config.sections.includes("daily")) {
        text(timeline.title, 13, y, 15, "Display");
        y += 7;
        const values = timeline.values,
          max = values.reduce((m, v) => Math.max(m, v.count), 1),
          cell = 180 / Math.max(1, values.length);
        for (let i = 0; i < 4; i++) {
          doc.setDrawColor(border);
          doc.line(17, y + (38 * i) / 3, 197, y + (38 * i) / 3);
        }
        values.forEach((v, i) => {
          const h = (v.count / max) * 38;
          doc.setFillColor(v.count === max ? "#E4632B" : muted);
          if (h) doc.rect(17 + i * cell, y + 38 - h, cell * 0.6, h, "F");
          if (values.length <= 31)
            text(
              "label" in v ? String(v.label) : v.name.slice(-2),
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
        "Detecciones agrupadas por día y cuadrícula aproximada de 1 km. VIIRS representa las coincidencias con MODIS. Un foco no equivale a un incendio independiente.",
        13,
        Math.min(y, 257),
        8,
        "Text",
        muted,
        184,
      );
    }
    if (page.kind === "ranking") {
      text("Rankings del periodo", 13, 39, 21, "Display");
      text(periodLabel(config), 13, 49, 10, "Text", muted);
      bars("Países con más focos · top 15", ranks.countries.slice(0, 15), 63);
      bars("Por sensor representativo", ranks.sensors, 203);
      text(
        "Países asignados con límites generalizados de Natural Earth. Los puntos fuera de los polígonos se conservan como Sin asignar.",
        13,
        244,
        9,
        "Text",
        muted,
        184,
      );
    }
    if (page.kind === "local-ranking") {
      text("Rankings del reto local · Cochabamba", 13, 39, 19, "Display");
      text(periodLabel(config), 13, 49, 10, "Text", muted);
      bars(
        "Municipios · top 15",
        ranks.municipalities.slice(0, 15),
        65,
        13,
        88,
      );
      bars("Provincias · top 15", ranks.provinces.slice(0, 15), 65, 109, 88);
      text(
        "Solo se incluyen detecciones con asignación administrativa dentro de los límites de Cochabamba.",
        13,
        215,
        9,
        "Text",
        muted,
        184,
      );
    }
    if (page.kind === "warnings") {
      text("Disponibilidad de los datos", 13, 40, 19, "Display");
      text(periodLabel(config), 13, 49, 10, "Text", muted);
      let y = 63;
      for (const warning of config.warnings!.slice(
        page.offset,
        page.offset + 8,
      )) {
        doc.setFont("Text");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(warning, 180) as string[];
        text(lines.join("\n"), 13, y, 9, "Text", muted);
        y += lines.length * 4.5 + 7;
      }
    }
    if (page.kind === "table") {
      text("Detecciones del periodo", 13, 39, 18, "Display");
      text("Fecha / hora UTC−4", 13, 49, 8, "Mono", muted);
      text("País", 62, 49, 8, "Mono", muted);
      text("Sensor", 103, 49, 8, "Mono", muted);
      text("FRP MW", 126, 49, 8, "Mono", muted);
      text("Coordenadas", 148, 49, 8, "Mono", muted);
      data.slice(page.offset, page.offset + 28).forEach((d, i) => {
        const y = 58 + i * 7;
        text(`${d.date} ${d.time}`, 13, y, 7, "Mono");
        text((d.country || "Sin asignar").slice(0, 20), 62, y, 7);
        text(d.satellite, 103, y, 8);
        text(String(d.frp), 126, y, 7, "Mono");
        text(
          `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`,
          148,
          y,
          6,
          "Mono",
        );
        doc.setDrawColor(border);
        doc.line(13, y + 2, 197, y + 2);
      });
    }
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
