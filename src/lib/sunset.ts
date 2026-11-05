import { prisma } from "@/lib/prisma";

export type SunsetPick = {
  placeId: string;
  name: string;
  city: string;
  bestWindow: string;
  cloudHint: string | null;
  photoScore: number;
};

// "Today" in UTC, matching how SunsetSpot rows are seeded/stored (@db.Date, midnight UTC).
function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getSunsetIndex(params: { location?: string | null }): Promise<SunsetPick[]> {
  const { location } = params;

  const spots = await prisma.sunsetSpot.findMany({
    where: {
      date: todayUtc(),
      ...(location ? { place: { city: { equals: location, mode: "insensitive" } } } : {}),
    },
    include: { place: { select: { name: true, city: true } } },
    orderBy: { photoScore: "desc" },
  });

  return spots.map((s) => ({
    placeId: s.placeId,
    name: s.place.name,
    city: s.place.city,
    bestWindow: s.bestWindow,
    cloudHint: s.cloudHint,
    photoScore: s.photoScore,
  }));
}
