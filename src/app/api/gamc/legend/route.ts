import { NextRequest, NextResponse } from "next/server";
import { getLegend } from "@/lib/gamc/client";
import { toErrorResponse } from "@/lib/gamc/http";
import { parseLayer } from "@/lib/gamc/validation";

// GET /api/gamc/legend?layer=limite_urbano&style=svc_limite_urbano
//
// Fixes the original snippet, which never sent LAYER — GetLegendGraphic
// can't pick a legend without knowing which layer it's for.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const layer = parseLayer(params.get("layer"));
    const style = params.get("style") ?? undefined;

    const legend = await getLegend({ layer, style });
    return new NextResponse(legend.body, {
      headers: {
        "content-type": legend.contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
