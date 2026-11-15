import { NextResponse } from "next/server";
import { getMapKeyStatus } from "@/lib/firms/client";
import { toErrorResponse } from "@/lib/firms/http";

export async function GET() {
  try {
    const status = await getMapKeyStatus();
    return NextResponse.json(status);
  } catch (error) {
    return toErrorResponse(error);
  }
}
