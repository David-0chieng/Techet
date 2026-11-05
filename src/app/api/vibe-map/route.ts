import { NextResponse } from "next/server";
import { getVibeMap } from "@/lib/vibemap";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");

  const spots = await getVibeMap({ location });
  return NextResponse.json({ spots });
}
