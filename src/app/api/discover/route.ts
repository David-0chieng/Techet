import { NextResponse } from "next/server";
import { getDiscoverFeed, parseCoords } from "@/lib/discover";
import { MOODS, type MoodType } from "@/lib/moods";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moodParam = searchParams.get("mood");
  const location = searchParams.get("location");
  const userCoords = parseCoords(searchParams.get("lat") ?? undefined, searchParams.get("lng") ?? undefined);

  const mood: MoodType | null =
    moodParam && MOODS.some((m) => m.key === moodParam) ? (moodParam as MoodType) : null;

  const feed = await getDiscoverFeed({ mood, location, userCoords });
  return NextResponse.json(feed);
}
