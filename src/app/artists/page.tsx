import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { prisma } from "@/lib/prisma";
import { ARTIST_CATEGORIES, ARTIST_CATEGORY_LABEL } from "@/lib/artists";

export default async function ArtistsPage({ searchParams }: PageProps<"/artists">) {
  const { category } = await searchParams;
  const activeCategory =
    typeof category === "string" ? ARTIST_CATEGORIES.find((c) => c === category) : undefined;

  const artists = await prisma.artistProfile.findMany({
    where: {
      available: true,
      ...(activeCategory ? { category: activeCategory } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book an artist</h1>
          <p className="mt-3 max-w-xl text-muted">
            DJs, MCs, photographers, dancers — vetted talent for your next function along the coast.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/artists"
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !activeCategory
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              All
            </Link>
            {Object.entries(ARTIST_CATEGORY_LABEL).map(([key, label]) => (
              <Link
                key={key}
                href={`/artists?category=${key}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? "border-accent bg-accent text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          {artists.length === 0 ? (
            <p className="text-muted">No artists in this category yet — check back soon.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{artist.displayName}</h3>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      {ARTIST_CATEGORY_LABEL[artist.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{artist.city}</p>
                  {artist.bio && <p className="mt-2 line-clamp-2 text-sm text-muted">{artist.bio}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
