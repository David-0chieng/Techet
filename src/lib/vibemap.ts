import { prisma } from "@/lib/prisma";

export type CrowdLevel = "low" | "medium" | "high";

export type VibeMapSpot = {
  id: string;
  kind: "place" | "event";
  name: string;
  category: string;
  city: string;
  lat: number | null;
  lng: number | null;
  crowdLevel: CrowdLevel;
  signalCount24h: number;
  happeningNow: boolean;
};

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

// v1 crowd level: recent signal velocity (last 24h), falling back to trendingScore for
// freshly-added spots that haven't collected any check-ins/saves/comments yet.
function crowdLevelFor(signalCount: number, trendingScore: number): CrowdLevel {
  const score = signalCount > 0 ? signalCount * 4 + trendingScore : trendingScore;
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export async function getVibeMap(params: { location?: string | null }): Promise<VibeMapSpot[]> {
  const { location } = params;
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const now = new Date();

  const places = await prisma.place.findMany({
    where: location ? { city: { equals: location, mode: "insensitive" } } : {},
    include: { vibeSignals: { where: { createdAt: { gte: since } } } },
  });

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      ...(location ? { venue: { city: { equals: location, mode: "insensitive" } } } : {}),
    },
    include: { venue: { select: { name: true, city: true } } },
  });

  const placeSpots: VibeMapSpot[] = places.map((p) => ({
    id: p.id,
    kind: "place",
    name: p.name,
    category: p.category,
    city: p.city,
    lat: p.lat,
    lng: p.lng,
    crowdLevel: crowdLevelFor(p.vibeSignals.length, p.trendingScore),
    signalCount24h: p.vibeSignals.length,
    happeningNow: false,
  }));

  const eventSpots: VibeMapSpot[] = events
    .filter((e) => !location || e.venue?.city?.toLowerCase() === location.toLowerCase())
    .map((e) => ({
      id: e.id,
      kind: "event",
      name: e.title,
      category: e.category,
      city: e.venue?.city ?? "",
      lat: null,
      lng: null,
      crowdLevel: crowdLevelFor(0, e.trendingScore),
      signalCount24h: 0,
      happeningNow: e.startsAt <= now && e.endsAt >= now,
    }));

  return [...placeSpots, ...eventSpots].sort((a, b) => {
    if (a.happeningNow !== b.happeningNow) return a.happeningNow ? -1 : 1;
    return b.signalCount24h - a.signalCount24h;
  });
}
