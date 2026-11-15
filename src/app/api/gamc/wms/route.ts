import { NextRequest, NextResponse } from "next/server";
import { GamcError, proxyGamc } from "@/lib/gamc/proxy";
export async function GET(request: NextRequest) {
  try {
    return await proxyGamc(request.nextUrl.searchParams);
  } catch (error) {
    if (error instanceof GamcError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      { error: "No se pudo procesar la consulta municipal." },
      { status: 502 },
    );
  }
}
