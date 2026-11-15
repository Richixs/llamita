import { NextRequest, NextResponse } from "next/server";
import { getMapTile } from "@/lib/gamc/client";
import { toErrorResponse } from "@/lib/gamc/http";
import {
  parseBbox,
  parseLayer,
  parseSrs,
  parseTileSize,
  parseTransparent,
  parseVersion,
} from "@/lib/gamc/validation";

// GET /api/gamc/map?layer=limite_urbano&bbox=-7366261,-1973397,-7365261,-1972397&width=256&height=256
//
// Meant to sit behind a Leaflet L.tileLayer.wms pointed at this URL: Leaflet
// appends its own WMS query params (LAYERS/BBOX/WIDTH/HEIGHT/SRS/...) per
// tile, so this also accepts the standard uppercase WMS names as a fallback.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const layer = parseLayer(params.get("layer") ?? params.get("LAYERS"));
    const bbox = parseBbox(params.get("bbox") ?? params.get("BBOX"));
    const width = parseTileSize(params.get("width") ?? params.get("WIDTH"), "width");
    const height = parseTileSize(params.get("height") ?? params.get("HEIGHT"), "height");
    const srs = parseSrs(params.get("srs") ?? params.get("SRS"));
    const transparent = parseTransparent(params.get("transparent") ?? params.get("TRANSPARENT"));
    const version = parseVersion(params.get("version") ?? params.get("VERSION"));

    const tile = await getMapTile({
      layers: layer,
      bbox,
      width,
      height,
      srs,
      format: "image/png",
      transparent,
      version,
    });

    return new NextResponse(tile.body, {
      headers: {
        "content-type": tile.contentType,
        "cache-control": "public, max-age=60",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
