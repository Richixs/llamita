import { NextRequest, NextResponse } from "next/server";
import { parseHotspotQuery, queryHotspots } from "@/lib/firms/query";
import { toErrorResponse } from "@/lib/firms/http";
export async function GET(request: NextRequest) {
  try {
    const query = parseHotspotQuery(request.nextUrl.searchParams);
    return NextResponse.json(await queryHotspots(query), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
