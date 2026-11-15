import type { GAMC_LAYERS } from "./constants";

export type GamcLayer = (typeof GAMC_LAYERS)[number];

export interface GamcMapRequest {
  layers: GamcLayer;
  bbox: string;
  width: number;
  height: number;
  srs: string;
  format: string;
  transparent: boolean;
  version: string;
  styles?: string;
}

export interface GamcFeatureInfoRequest {
  layer: GamcLayer;
  bbox: string;
  width: number;
  height: number;
  x: number;
  y: number;
  srs: string;
  featureCount: number;
}

export interface GamcFeatureInfoResult {
  requestedLayer: GamcLayer;
  warning: string;
  // Passed through verbatim from the upstream GeoJSON FeatureCollection.
  features: unknown[];
}

export interface GamcLegendRequest {
  layer: GamcLayer;
  style?: string;
}

export interface GamcImageResponse {
  body: ArrayBuffer;
  contentType: string;
}
