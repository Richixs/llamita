import { NextResponse } from "next/server";
import {
  FirmsConfigError,
  FirmsUnavailableError,
  FirmsUpstreamError,
  FirmsValidationError,
} from "./errors";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof FirmsValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (
    error instanceof FirmsConfigError ||
    error instanceof FirmsUnavailableError
  ) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof FirmsUpstreamError) {
    if (error.status === 429)
      return NextResponse.json(
        { error: error.message, code: "FIRMS_RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  // Never log upstream URLs: FIRMS embeds its key in the path.
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
