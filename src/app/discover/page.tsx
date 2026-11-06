import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { NearMeButton } from "@/components/discover/NearMeButton";
import { auth } from "@/lib/auth";
import { getDiscoverFeed, parseCoords } from "@/lib/discover";
import { MOODS, type MoodType } from "@/lib/moods";
import { formatEventDate, formatPrice } from "@/lib/format";
import { track } from "@/lib/analytics";

const CATEGORY_LABEL: Record<string, string> = {
  FOOD: "Food spots",
  ACTIVITY: "Activities",
  VIEWPOINT: "Viewpoints",
  NIGHTLIFE: "Nightlife",
  OTHER: "Places",
};

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const { mood: moodParam, location, lat, lng } = await searchParams;
  const mood = typeof moodParam === "string" && MOODS.some((m) => m.key === moodParam) ? (moodParam as MoodType) : null;
  const locationFilter = typeof location === "string" ? location : null;
  const userCoords = parseCoords(lat, lng);

  const session = await auth();
  if (mood) {
    void track("mood_selected", { mood, location: locationFilter }, session?.user?.id);
  }

  const { places, events } = await getDiscoverFeed({ mood, location: locationFilter, userCoords });

  // Mood filter links keep the user's location so "Near me" survives mood switching.
  const moodHref = (moodKey: string | null) => {
    const params = new URLSearchParams();
    if (moodKey) params.set("mood", moodKey);
    if (typeof location === "string") params.set("location", location);
    if (userCoords) {
      params.set("lat", String(userCoords.lat));
      params.set("lng", String(userCoords.lng));
    }
    const query = params.toString();
    return query ? `/discover?${query}` : "/discover";
  };

  const placesByCategory = places.reduce<Record<string, typeof places>>((acc, place) => {
    (acc[place.category] ??= []).push(place);
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s the vibe today?</h1>
          <p className="mt-3 max-w-xl text-muted">
            Pick a mood and we&apos;ll surface the events, food spots, and activities that match it
            along the coast.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={moodHref(null)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !mood
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              All moods
            </Link>
            {MOODS.map((m) => (
              <Link
                key={m.key}
                href={moodHref(m.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  mood === m.key
                    ? "border-accent bg-accent text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {m.emoji} {m.label}
              </Link>
            ))}
            <NearMeButton />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-10">
          <h2 className="text-xl font-bold tracking-tight">Events</h2>
          {events.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No events match that mood yet — check back soon.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent-2"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-background">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-medium text-muted">{formatEventDate(event.startsAt)}</div>
                    <h3 className="mt-1 text-base font-semibold tracking-tight">{event.title}</h3>
                    {event.venueName && (
                      <p className="mt-1 text-sm text-muted">
                        {event.venueName}, {event.venueCity}
                        {event.distanceKm !== null && ` · ${event.distanceKm} km away`}
                      </p>
                    )}
                    <div className="mt-2 text-sm font-semibold text-accent-2">
                      {event.fromPrice !== null ? `From ${formatPrice(event.fromPrice)}` : "Dropping soon"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {Object.entries(placesByCategory).map(([category, items]) => (
          <section key={category} className="mx-auto max-w-6xl px-6 pb-10">
            <h2 className="text-xl font-bold tracking-tight">{CATEGORY_LABEL[category] ?? category}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((place) => (
                <div key={place.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{place.name}</h3>
                    <span className="text-xs text-muted">{"$".repeat(place.priceLevel)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {place.city}
                    {place.distanceKm !== null && ` · ${place.distanceKm} km away`}
                  </p>
                  {place.description && <p className="mt-2 text-sm text-muted">{place.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {place.moods.map((m) => (
                      <span
                        key={m.key}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                      >
                        {m.emoji} {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {places.length === 0 && events.length === 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-20 text-center text-muted">
            Nothing matches yet — try a different mood.
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
