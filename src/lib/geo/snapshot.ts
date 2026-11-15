import type { Detection } from "@/lib/llamita/data";
import { mercator, type Bbox } from "./catalog";
const COLORS = ["#FFE3A3", "#F7B24A", "#E4632B", "#C2361C", "#7A1A10"];
export function geographicSnapshot(
  data: Detection[],
  bbox: Bbox,
  width = 900,
  height = 380,
) {
  const sw = mercator(bbox[0], bbox[1]),
    ne = mercator(bbox[2], bbox[3]);
  const project = (lon: number, lat: number) => {
    const p = mercator(lon, lat);
    return [
      28 + ((p[0] - sw[0]) / (ne[0] - sw[0])) * (width - 56),
      height - 24 - ((p[1] - sw[1]) / (ne[1] - sw[1])) * (height - 48),
    ];
  };
  const grid = Array.from({ length: 5 }, (_, i) => {
    const lon = bbox[0] + ((bbox[2] - bbox[0]) * i) / 4,
      lat = bbox[1] + ((bbox[3] - bbox[1]) * i) / 4;
    const [x, y] = project(lon, lat);
    return `<path d="M${x} 16V${height - 24}M28 ${y}H${width - 28}" stroke="#E2D6CA"/><text x="${x}" y="${height - 7}" text-anchor="middle" font-size="10" fill="#6B5A4F">${lon.toFixed(3)}°</text>`;
  }).join("");
  const markers = data
    .map((d) => {
      const [x, y] = project(d.longitude, d.latitude);
      const index =
        d.frp < 5 ? 0 : d.frp < 10 ? 1 : d.frp < 25 ? 2 : d.frp <= 50 ? 3 : 4;
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="${COLORS[index]}" stroke="white" stroke-width="1"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="monospace"><rect width="${width}" height="${height}" fill="#F7F2EA"/>${grid}${markers}<text x="8" y="13" font-size="10" fill="#6B5A4F">${bbox[3].toFixed(3)}°</text><text x="8" y="${height - 28}" font-size="10" fill="#6B5A4F">${bbox[1].toFixed(3)}°</text></svg>`;
}
export async function svgPng(svg: string, width: number, height: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo dibujar el mapa del reporte.");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
