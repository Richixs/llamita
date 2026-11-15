import { NextRequest, NextResponse } from "next/server";
import { getCountryHotspots } from "@/lib/firms/client";
import { toErrorResponse } from "@/lib/firms/http";
import { parseCountryCode, parseDateParam, parseDayRange, parseSource } from "@/lib/firms/validation";

// GET /api/firms/country?source=MODIS_NRT&code=BOL&dayRange=4&date=2026-11-01
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const source = parseSource(params.get("source"));
    const countryCode = parseCountryCode(params.get("code"));
    const dayRange = parseDayRange(params.get("dayRange"));
    const date = parseDateParam(params.get("date"));

    const hotspots = await getCountryHotspots({ source, countryCode, dayRange, date });
    return NextResponse.json(hotspots);
  } catch (error) {
    return toErrorResponse(error);
  }
}
