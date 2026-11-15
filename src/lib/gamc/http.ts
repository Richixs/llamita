import { NextResponse } from "next/server";
import { GamcConfigError, GamcUpstreamError, GamcValidationError } from "./errors";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof GamcValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof GamcConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (error instanceof GamcUpstreamError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
