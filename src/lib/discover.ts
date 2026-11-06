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
  /** Distance from the user in km, when user coordinates and place coordinates are both known. */
  distanceKm: number | null;
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
  /** Distance from the user in km, when user and venue coordinates are both known. */
  distanceKm: number | null;
};

export type DiscoverFeed = {
  places: DiscoverPlace[];
  events: DiscoverEvent[];
};

export type Coordinates = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points in km (haversine formula). */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Nearby places get up to +25 on top of trending (comparable scale to trendingScore 0–100).
// The boost fades to zero at 10 km so other coastal towns still rank on their own merits.
function proximityBoost(distanceKm: number | null): number {
  if (distanceKm === null) return 0;
  return Math.max(0, 25 - 2.5 * distanceKm);
}

// Ranking: trending_score + recency + proximity (when the user shares their location
// and the place/venue has coordinates).
function placeScore(
  trendingScore: number,
  updatedAt: Date,
  now: number,
  distanceKm: number | null,
): number {
  const daysSinceUpdate = (now - updatedAt.getTime()) / 86_400_000;
  const recencyBoost = Math.max(0, 10 - daysSinceUpdate);
  return trendingScore + recencyBoost + proximityBoost(distanceKm);
}

function eventScore(
  trendingScore: number,
  startsAt: Date,
  now: number,
  distanceKm: number | null = null,
): number {
  const daysUntil = (startsAt.getTime() - now) / 86_400_000;
  const soonBoost = daysUntil >= 0 ? Math.max(0, 10 - daysUntil) : 0;
  return trendingScore + soonBoost + proximityBoost(distanceKm);
}

export function placeDistanceKm(
  place: { lat: number | null; lng: number | null },
  user: Coordinates | null,
): number | null {
  if (!user || place.lat === null || place.lng === null) return null;
  return haversineKm(user, { lat: place.lat, lng: place.lng });
}

export function rankPlaces<
  T extends { trendingScore: number; updatedAt: Date; lat: number | null; lng: number | null },
>(items: T[], userCoords: Coordinates | null = null, now: number = Date.now()): T[] {
  const score = (item: T) =>
    placeScore(item.trendingScore, item.updatedAt, now, placeDistanceKm(item, userCoords));
  return [...items].sort((a, b) => score(b) - score(a));
}

export function rankEvents<
  T extends { trendingScore: number; startsAt: Date; lat?: number | null; lng?: number | null },
>(items: T[], userCoords: Coordinates | null = null, now: number = Date.now()): T[] {
  const score = (item: T) =>
    eventScore(
      item.trendingScore,
      item.startsAt,
      now,
      placeDistanceKm({ lat: item.lat ?? null, lng: item.lng ?? null }, userCoords),
    );
  return [...items].sort((a, b) => score(b) - score(a));
}

/** Parses raw lat/lng query values into validated coordinates, or null if absent/invalid. */
export function parseCoords(latRaw: unknown, lngRaw: unknown): Coordinates | null {
  if (typeof latRaw !== "string" || typeof lngRaw !== "string") return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function getDiscoverFeed(params: {
  mood?: MoodType | null;
  location?: string | null;
  userCoords?: Coordinates | null;
}): Promise<DiscoverFeed> {
  const { mood, location, userCoords = null } = params;

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
      venue: { select: { name: true, city: true, lat: true, lng: true } },
      ticketTypes: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
    },
  });

  // Hoist venue coordinates so events can join the same distance-aware ranking as places.
  const rankedEvents = rankEvents(
    events.map((e) => ({ ...e, lat: e.venue?.lat ?? null, lng: e.venue?.lng ?? null })),
    userCoords,
  );

  return {
    places: rankPlaces(places, userCoords).map((p) => {
      const distanceKm = placeDistanceKm(p, userCoords);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        imageUrl: p.imageUrl,
        city: p.city,
        priceLevel: p.priceLevel,
        trendingScore: p.trendingScore,
        distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
        moods: p.moods.map((m) => ({ key: m.key, label: m.label, emoji: m.emoji })),
      };
    }),
    events: rankedEvents.map((e) => {
      const distanceKm = placeDistanceKm(e, userCoords);
      return {
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
        distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      };
    }),
  };
}
