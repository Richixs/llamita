import { NextRequest, NextResponse } from "next/server";
import { getFeatureInfo } from "@/lib/gamc/client";
import { toErrorResponse } from "@/lib/gamc/http";
import {
  parseBbox,
  parseFeatureCount,
  parseLayer,
  parsePixel,
  parseSrs,
  parseTileSize,
} from "@/lib/gamc/validation";

// GET /api/gamc/feature-info?layer=limite_urbano&bbox=...&width=256&height=256&x=128&y=128
//
// NOTE: GAMC's GetFeatureInfo has been observed to ignore the requested
// layer and always return the "periurbanos" attribute schema. This route
// always sends LAYERS/QUERY_LAYERS (the original snippet sent neither) and
// flags the known bug in the response so callers don't trust it blindly.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const layer = parseLayer(params.get("layer"));
    const bbox = parseBbox(params.get("bbox"));
    const width = parseTileSize(params.get("width"), "width");
    const height = parseTileSize(params.get("height"), "height");
    const x = parsePixel(params.get("x"), "x", width);
    const y = parsePixel(params.get("y"), "y", height);
    const srs = parseSrs(params.get("srs"));
    const featureCount = parseFeatureCount(params.get("featureCount"));

    const result = await getFeatureInfo({ layer, bbox, width, height, x, y, srs, featureCount });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
