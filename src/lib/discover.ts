import { prisma } from "@/lib/prisma";
import type { MoodType } from "./moods";

export type DiscoverPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  city: string;
  priceLevel: number;
  trendingScore: number;
  moods: { key: string; label: string; emoji: string | null }[];
};

export type DiscoverEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string | null;
  startsAt: Date;
  venueName: string | null;
  venueCity: string | null;
  fromPrice: number | null;
  trendingScore: number;
};

export type DiscoverFeed = {
  places: DiscoverPlace[];
  events: DiscoverEvent[];
};

// Simple v1 ranking: trending_score + recency. Distance is intentionally omitted —
// we don't yet collect user geolocation/place coordinates on the client (see roadmap).
function placeScore(trendingScore: number, updatedAt: Date, now: number): number {
  const daysSinceUpdate = (now - updatedAt.getTime()) / 86_400_000;
  const recencyBoost = Math.max(0, 10 - daysSinceUpdate);
  return trendingScore + recencyBoost;
}

function eventScore(trendingScore: number, startsAt: Date, now: number): number {
  const daysUntil = (startsAt.getTime() - now) / 86_400_000;
  const soonBoost = daysUntil >= 0 ? Math.max(0, 10 - daysUntil) : 0;
  return trendingScore + soonBoost;
}

export function rankPlaces<T extends { trendingScore: number; updatedAt: Date }>(
  items: T[],
  now: number = Date.now(),
): T[] {
  return [...items].sort((a, b) => placeScore(b.trendingScore, b.updatedAt, now) - placeScore(a.trendingScore, a.updatedAt, now));
}

export function rankEvents<T extends { trendingScore: number; startsAt: Date }>(
  items: T[],
  now: number = Date.now(),
): T[] {
  return [...items].sort((a, b) => eventScore(b.trendingScore, b.startsAt, now) - eventScore(a.trendingScore, a.startsAt, now));
}

export async function getDiscoverFeed(params: {
  mood?: MoodType | null;
  location?: string | null;
}): Promise<DiscoverFeed> {
  const { mood, location } = params;

  const places = await prisma.place.findMany({
    where: {
      ...(mood ? { moods: { some: { key: mood } } } : {}),
      ...(location ? { city: { equals: location, mode: "insensitive" } } : {}),
    },
    include: { moods: true },
  });

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      ...(mood ? { moods: { some: { key: mood } } } : {}),
      ...(location ? { venue: { city: { equals: location, mode: "insensitive" } } } : {}),
    },
    include: {
      venue: { select: { name: true, city: true } },
      ticketTypes: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
    },
  });

  return {
    places: rankPlaces(places).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      city: p.city,
      priceLevel: p.priceLevel,
      trendingScore: p.trendingScore,
      moods: p.moods.map((m) => ({ key: m.key, label: m.label, emoji: m.emoji })),
    })),
    events: rankEvents(events).map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      category: e.category,
      imageUrl: e.imageUrl,
      startsAt: e.startsAt,
      venueName: e.venue?.name ?? null,
      venueCity: e.venue?.city ?? null,
      fromPrice: e.ticketTypes[0] ? Number(e.ticketTypes[0].price) : null,
      trendingScore: e.trendingScore,
    })),
  };
}
