import { NextResponse } from "next/server";
import { getDiscoverFeed } from "@/lib/discover";
import { MOODS, type MoodType } from "@/lib/moods";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moodParam = searchParams.get("mood");
  const location = searchParams.get("location");

  const mood: MoodType | null =
    moodParam && MOODS.some((m) => m.key === moodParam) ? (moodParam as MoodType) : null;

  const feed = await getDiscoverFeed({ mood, location });
  return NextResponse.json(feed);
}
