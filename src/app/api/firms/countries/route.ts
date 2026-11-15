import { NextResponse } from "next/server";
import { getCountries } from "@/lib/firms/client";
import { toErrorResponse } from "@/lib/firms/http";

export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json(countries);
  } catch (error) {
    return toErrorResponse(error);
  }
}
