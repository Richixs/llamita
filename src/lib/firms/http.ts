import { NextResponse } from "next/server";
import {
  FirmsConfigError,
  FirmsUpstreamError,
  FirmsValidationError,
} from "./errors";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof FirmsValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof FirmsConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (error instanceof FirmsUpstreamError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
