import { NextRequest, NextResponse } from "next/server";
import { getBoundary, type BoundaryType } from "@/lib/geo/boundaries";

// GET /api/geo/boundary?type=province&name=Ayopaya
//
// Serves a single province/municipio polygon on demand, so the client only
// downloads the one feature it needs instead of bundling the full ~670KB
// of Cochabamba boundary data (src/lib/geo/data/*.json) into the map.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const name = params.get("name");

  if (type !== "province" && type !== "municipality")
    return NextResponse.json(
      { error: '"type" must be "province" or "municipality".' },
      { status: 400 },
    );
  if (!name)
    return NextResponse.json({ error: '"name" is required.' }, { status: 400 });

  const feature = getBoundary(type as BoundaryType, name);
  if (!feature)
    return NextResponse.json(
      { error: "Límite no encontrado." },
      { status: 404 },
    );

  return NextResponse.json(feature, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
