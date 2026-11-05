import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weekendGenerateSchema } from "@/lib/validation/weekend";
import { buildWeekendPlan, type WeekendCandidateEvent, type WeekendCandidatePlace } from "@/lib/weekend";
import { track } from "@/lib/analytics";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to build a weekend plan." }, { status: 401 });
  }

  const parsed = weekendGenerateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const [places, events] = await Promise.all([
    prisma.place.findMany({
      where: {
        city: { equals: input.location, mode: "insensitive" },
        moods: { some: { key: input.mood } },
      },
    }),
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        moods: { some: { key: input.mood } },
        venue: { city: { equals: input.location, mode: "insensitive" } },
      },
      include: {
        venue: { select: { city: true } },
        ticketTypes: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
      },
    }),
  ]);

  const candidatePlaces: WeekendCandidatePlace[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    city: p.city,
    priceLevel: p.priceLevel,
    trendingScore: p.trendingScore,
  }));
  const candidateEvents: WeekendCandidateEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    city: e.venue?.city ?? null,
    fromPrice: e.ticketTypes[0] ? Number(e.ticketTypes[0].price) : null,
    trendingScore: e.trendingScore,
  }));

  const plan = buildWeekendPlan(input, candidatePlaces, candidateEvents);

  const baseSlug = slugify(`${input.location}-weekend`) || "weekend";
  let shareSlug = baseSlug;
  for (let i = 1; await prisma.itinerary.findUnique({ where: { shareSlug } }); i++) {
    shareSlug = `${baseSlug}-${i}`;
  }

  const itinerary = await prisma.itinerary.create({
    data: {
      userId: session.user.id,
      title: `${input.location} weekend`,
      location: input.location,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      mood: input.mood,
      groupSize: input.groupSize,
      transport: input.transport,
      totalCost: plan.totalCost,
      shareSlug,
      items: {
        create: plan.items.map((item) => ({
          day: item.day,
          block: item.block,
          title: item.title,
          placeId: item.placeId,
          eventId: item.eventId,
          estCost: item.estCost,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { items: true },
  });

  void track(
    "weekend_generated",
    { itineraryId: itinerary.id, location: input.location, mood: input.mood },
    session.user.id,
  );

  return NextResponse.json({ itinerary, routeSummary: plan.routeSummary }, { status: 201 });
}
