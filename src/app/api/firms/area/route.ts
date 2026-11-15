import { NextRequest, NextResponse } from "next/server";
import { getAreaHotspots } from "@/lib/firms/client";
import { toErrorResponse } from "@/lib/firms/http";
import {
  parseAreaCoordinates,
  parseDateParam,
  parseDayRange,
  parseSource,
} from "@/lib/firms/validation";

// GET /api/firms/area?source=VIIRS_NOAA20_NRT&bbox=-70,-23,-57,-9&dayRange=3&date=2026-11-01
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const source = parseSource(params.get("source"));
    const coordinates = parseAreaCoordinates(params.get("bbox"));
    const dayRange = parseDayRange(params.get("dayRange"));
    const date = parseDateParam(params.get("date"));

    const hotspots = await getAreaHotspots({
      source,
      coordinates,
      dayRange,
      date,
    });
    return NextResponse.json(hotspots);
  } catch (error) {
    return toErrorResponse(error);
  }
}
