import type { Detection } from "@/lib/llamita/data";
import { mercator, type Bbox } from "./catalog";
import context from "./map-context.json" with { type: "json" };
const WORLD = 40075016.68557849;
const COLORS = ["#FFE3A3", "#F7B24A", "#E4632B", "#C2361C", "#7A1A10"];
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function snapshotViewport(bbox: Bbox, width: number, height: number) {
  const sw = mercator(bbox[0], bbox[1]),
    ne = mercator(bbox[2], bbox[3]);
  const spanX = Math.max(ne[0] - sw[0], ((ne[1] - sw[1]) * width) / height, 1);
  const spanY = (spanX * height) / width;
  const left = (sw[0] + ne[0] - spanX) / 2,
    top = (sw[1] + ne[1] + spanY) / 2;
  return {
    left,
    top,
    spanX,
    spanY,
    project: (lon: number, lat: number) => {
      const p = mercator(lon, lat);
      return [((p[0] - left) / spanX) * width, ((top - p[1]) / spanY) * height];
    },
  };
}
export function geographicSnapshot(
  data: Detection[],
  bbox: Bbox,
  width = 900,
  height = 380,
  background?: string,
) {
  const { project } = snapshotViewport(bbox, width, height);
  const land = background
    ? `<image href="${background}" width="${width}" height="${height}"/>`
    : context
        .map((country) => {
          const paths = country.rings
            .map(
              (ring) =>
                ring
                  .map(([lon, lat], i) => {
                    const [x, y] = project(lon, lat);
                    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join("") + "Z",
            )
            .join("");
          return `<path d="${paths}" fill="#F7F2EA" stroke="#A8AAA2" stroke-width=".6"><title>${escape(country.name)}</title></path>`;
        })
        .join("");
  const markers = data
    .filter(
      (d) =>
        d.longitude >= bbox[0] &&
        d.longitude <= bbox[2] &&
        d.latitude >= bbox[1] &&
        d.latitude <= bbox[3],
    )
    .map((d) => {
      const [x, y] = project(d.longitude, d.latitude),
        index =
          d.frp < 5 ? 0 : d.frp < 10 ? 1 : d.frp < 25 ? 2 : d.frp <= 50 ? 3 : 4;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${data.length > 10000 ? 2 : 3.5}" fill="${COLORS[index]}" stroke="white" stroke-width=".8"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#DCE7E9"/>${land}${markers}<rect x="0" y="${height - 17}" width="${width}" height="17" fill="white" fill-opacity=".88"/><text x="8" y="${height - 5}" font-family="sans-serif" font-size="10" fill="#4C514E">${background ? "© OpenStreetMap contributors" : "Límites: Natural Earth"} · Focos: NASA FIRMS · Web Mercator</text></svg>`;
}
const bases = new Map<string, Promise<string | null>>();
async function baseMap(
  bbox: Bbox,
  width: number,
  height: number,
): Promise<string | null> {
  const key = JSON.stringify([bbox, width, height]);
  const cached = bases.get(key);
  if (cached) return cached;
  const task = (async () => {
    const view = snapshotViewport(bbox, width, height);
    const z = Math.max(
      0,
      Math.min(18, Math.floor(Math.log2((width * WORLD) / (view.spanX * 256)))),
    );
    const count = 2 ** z,
      pixels = 256 * count,
      scale = (width * WORLD) / (view.spanX * pixels);
    const left = ((view.left + WORLD / 2) / WORLD) * pixels,
      top = ((WORLD / 2 - view.top) / WORLD) * pixels;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#DCE7E9";
    ctx.fillRect(0, 0, width, height);
    const tasks: { x: number; y: number }[] = [];
    for (
      let x = Math.max(0, Math.floor(left / 256));
      x <= Math.min(count - 1, Math.floor((left + width / scale) / 256));
      x++
    )
      for (
        let y = Math.max(0, Math.floor(top / 256));
        y <= Math.min(count - 1, Math.floor((top + height / scale) / 256));
        y++
      )
        tasks.push({ x, y });
    let next = 0;
    async function worker() {
      while (next < tasks.length) {
        const { x, y } = tasks[next++];
        const response = await fetch(
          `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
          { signal: AbortSignal.timeout(12000) },
        );
        if (!response.ok) throw Error("Mapa base no disponible");
        const bitmap = await createImageBitmap(await response.blob());
        ctx!.drawImage(
          bitmap,
          (x * 256 - left) * scale,
          (y * 256 - top) * scale,
          256 * scale,
          256 * scale,
        );
        bitmap.close();
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    return canvas.toDataURL("image/png");
  })().catch(() => null);
  if (bases.size >= 8) bases.delete(bases.keys().next().value!);
  bases.set(key, task);
  // A failed map request can be retried on the next preview/download.
  void task.then((value) => {
    if (!value) bases.delete(key);
  });
  return task;
}
export async function geographicMapSnapshot(
  data: Detection[],
  bbox: Bbox,
  width = 900,
  height = 380,
) {
  return geographicSnapshot(
    data,
    bbox,
    width,
    height,
    (await baseMap(bbox, width, height)) || undefined,
  );
}
export async function svgPng(svg: string, width: number, height: number) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("No se pudo dibujar el mapa del reporte.");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
