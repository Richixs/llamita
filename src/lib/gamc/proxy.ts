import { GAMC_LAYERS } from "@/lib/geo/catalog";
export class GamcError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
const ENDPOINT = "https://serviciosgamc.cochabamba.bo/api/gs/wms";
const OPERATIONS = ["GetMap", "GetLegendGraphic", "GetFeatureInfo"];
const ALLOWED = new Set([
  "layer",
  "service",
  "version",
  "request",
  "layers",
  "styles",
  "format",
  "transparent",
  "srs",
  "bbox",
  "width",
  "height",
  "x",
  "y",
  "info_format",
  "feature_count",
  "query_layers",
]);
function integer(
  value: string | undefined,
  name: string,
  max: number,
  min = 1,
) {
  if (!value || !/^\d+$/.test(value))
    throw new GamcError(`El parámetro ${name} no es válido.`);
  const n = Number(value);
  if (n < min || n > max)
    throw new GamcError(`El parámetro ${name} está fuera de rango.`);
  return String(n);
}
export function buildGamcRequest(input: URLSearchParams, key: string) {
  const values: Record<string, string> = {};
  for (const [k, v] of input) {
    const name = k.toLowerCase();
    if (!ALLOWED.has(name) || Object.hasOwn(values, name))
      throw new GamcError(
        "La solicitud contiene parámetros no permitidos o repetidos.",
      );
    values[name] = v;
  }
  const layer = GAMC_LAYERS.find((l) => l.id === values.layer);
  if (!layer)
    throw new GamcError(
      "La capa solicitada no pertenece al catálogo autorizado.",
    );
  const operation = values.request || "GetMap";
  if (!OPERATIONS.includes(operation))
    throw new GamcError("Operación WMS no permitida.");
  if (values.service && values.service.toUpperCase() !== "WMS")
    throw new GamcError("El servicio debe ser WMS.");
  if (values.layers || values.styles || values.query_layers)
    throw new GamcError(
      "Las capas y los estilos los asigna el proxy municipal.",
    );
  const version = operation === "GetLegendGraphic" ? "1.0.0" : "1.1.1";
  if (values.version && values.version !== version)
    throw new GamcError("Versión WMS no admitida para esta operación.");
  if (values.format && values.format !== "image/png")
    throw new GamcError("El formato de imagen debe ser PNG.");
  const url = new URL(ENDPOINT);
  const params = url.searchParams;
  params.set("key", key);
  params.set("service_id", layer.serviceId);
  params.set("SERVICE", "WMS");
  params.set("VERSION", version);
  params.set("REQUEST", operation);
  params.set("LAYERS", "");
  params.set("FORMAT", "image/png");
  if (operation !== "GetLegendGraphic") {
    if (values.srs !== "EPSG:3857")
      throw new GamcError("El sistema de coordenadas debe ser EPSG:3857.");
    const parts = (values.bbox || "").split(",");
    const bbox = parts.map(Number);
    if (
      parts.length !== 4 ||
      parts.some((p) => !p.trim()) ||
      bbox.some((n) => !Number.isFinite(n) || Math.abs(n) > 20037509) ||
      bbox[0] >= bbox[2] ||
      bbox[1] >= bbox[3]
    )
      throw new GamcError("BBOX no es una extensión válida en EPSG:3857.");
    params.set("SRS", "EPSG:3857");
    params.set("BBOX", bbox.join(","));
    params.set("WIDTH", integer(values.width, "WIDTH", 1024));
    params.set("HEIGHT", integer(values.height, "HEIGHT", 1024));
    params.set("TRANSPARENT", "true");
    if (operation === "GetFeatureInfo") {
      if (values.info_format && values.info_format !== "application/json")
        throw new GamcError("La consulta de atributos debe usar JSON.");
      params.set("INFO_FORMAT", "application/json");
      params.set("QUERY_LAYERS", "");
      params.set("X", integer(values.x, "X", Number(values.width) - 1, 0));
      params.set("Y", integer(values.y, "Y", Number(values.height) - 1, 0));
      params.set(
        "FEATURE_COUNT",
        integer(values.feature_count || "5", "FEATURE_COUNT", 10),
      );
    }
  }
  return { url, operation };
}
export async function proxyGamc(input: URLSearchParams) {
  // Validate before reading credentials: invalid requests never reach GAMC.
  const request = buildGamcRequest(input, "");
  const key = process.env.GAMC_API_KEY?.trim();
  if (!key)
    throw new GamcError("Falta configurar GAMC_API_KEY en el servidor.", 503);
  request.url.searchParams.set("key", key);
  let response: Response;
  try {
    response = await fetch(request.url, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new GamcError(
      "No se pudo conectar con el servicio municipal. Intenta nuevamente.",
      502,
    );
  }
  if (!response.ok)
    throw new GamcError(
      `El servicio municipal rechazó la consulta (HTTP ${response.status}).`,
      502,
    );
  if (request.operation === "GetFeatureInfo") {
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new GamcError(
        "El servicio municipal no devolvió JSON válido.",
        502,
      );
    }
    if (
      !result ||
      typeof result !== "object" ||
      !("type" in result) ||
      result.type !== "FeatureCollection" ||
      !("features" in result) ||
      !Array.isArray(result.features)
    )
      throw new GamcError(
        "El servicio municipal no devolvió una colección de atributos válida.",
        502,
      );
    return Response.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const body = await response.arrayBuffer();
  const bytes = new Uint8Array(body);
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    throw new GamcError(
      "El servicio municipal no devolvió una imagen PNG válida.",
      502,
    );
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
