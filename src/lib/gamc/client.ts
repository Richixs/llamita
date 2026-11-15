import {
  GAMC_BASE_URL,
  KNOWN_FEATURE_INFO_BUG_WARNING,
} from "./constants";
import { GamcConfigError, GamcUpstreamError } from "./errors";
import type {
  GamcFeatureInfoRequest,
  GamcFeatureInfoResult,
  GamcImageResponse,
  GamcLegendRequest,
  GamcMapRequest,
} from "./types";

function getCredentials(): { key: string; serviceId: string } {
  const key = process.env.GAMC_KEY;
  const serviceId = process.env.GAMC_SERVICE_ID;
  if (!key || !serviceId) {
    throw new GamcConfigError("GAMC_KEY and GAMC_SERVICE_ID environment variables are not set");
  }
  return { key, serviceId };
}

async function fetchGamcImage(params: URLSearchParams): Promise<GamcImageResponse> {
  const response = await fetch(`${GAMC_BASE_URL}?${params}`, { cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";

  // The upstream reports errors as text/XML with a 200 status, not as an
  // HTTP error code, so a non-image content type is treated as a failure.
  if (!response.ok || !contentType.startsWith("image/")) {
    const body = await response.text();
    throw new GamcUpstreamError(`GAMC request failed: ${body || response.statusText}`, response.status || 502);
  }

  return { body: await response.arrayBuffer(), contentType };
}

export async function getMapTile(params: GamcMapRequest): Promise<GamcImageResponse> {
  const { key, serviceId } = getCredentials();
  const query = new URLSearchParams({
    key,
    service_id: serviceId,
    SERVICE: "WMS",
    VERSION: params.version,
    REQUEST: "GetMap",
    LAYERS: params.layers,
    STYLES: params.styles ?? "",
    FORMAT: params.format,
    TRANSPARENT: String(params.transparent),
    SRS: params.srs,
    BBOX: params.bbox,
    WIDTH: String(params.width),
    HEIGHT: String(params.height),
  });
  return fetchGamcImage(query);
}

export async function getLegend(params: GamcLegendRequest): Promise<GamcImageResponse> {
  const { key, serviceId } = getCredentials();
  const query = new URLSearchParams({
    key,
    service_id: serviceId,
    REQUEST: "GetLegendGraphic",
    VERSION: "1.0.0",
    FORMAT: "image/png",
    LAYER: params.layer,
  });
  if (params.style) {
    query.set("STYLE", params.style);
  }
  return fetchGamcImage(query);
}

export async function getFeatureInfo(
  params: GamcFeatureInfoRequest,
): Promise<GamcFeatureInfoResult> {
  const { key, serviceId } = getCredentials();
  const query = new URLSearchParams({
    key,
    service_id: serviceId,
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    // Fixes the original snippet, which omitted both of these and so
    // never told the server which layer to query.
    LAYERS: params.layer,
    QUERY_LAYERS: params.layer,
    SRS: params.srs,
    BBOX: params.bbox,
    WIDTH: String(params.width),
    HEIGHT: String(params.height),
    X: String(params.x),
    Y: String(params.y),
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: String(params.featureCount),
  });

  const response = await fetch(`${GAMC_BASE_URL}?${query}`, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok) {
    throw new GamcUpstreamError(`GAMC request failed: ${text || response.statusText}`, response.status);
  }

  let parsed: { features?: unknown[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GamcUpstreamError(`GAMC returned a non-JSON response: ${text}`, 502);
  }

  return {
    requestedLayer: params.layer,
    warning: KNOWN_FEATURE_INFO_BUG_WARNING,
    features: parsed.features ?? [],
  };
}
