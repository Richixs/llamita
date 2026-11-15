import { NextRequest, NextResponse } from "next/server";
import { getDataAvailability } from "@/lib/firms/client";
import { toErrorResponse } from "@/lib/firms/http";
import { parseAvailabilitySensor } from "@/lib/firms/validation";

export async function GET(request: NextRequest) {
  try {
    const sensor = parseAvailabilitySensor(request.nextUrl.searchParams.get("sensor"));
    const availability = await getDataAvailability(sensor);
    return NextResponse.json(availability);
  } catch (error) {
    return toErrorResponse(error);
  }
}
