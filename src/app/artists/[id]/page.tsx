import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { prisma } from "@/lib/prisma";
import { ARTIST_CATEGORY_LABEL } from "@/lib/artists";
import { BookingRequestForm } from "@/components/artist/BookingRequestForm";

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await prisma.artistProfile.findUnique({ where: { id } });
  if (!artist || !artist.available) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div>
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent">
                {ARTIST_CATEGORY_LABEL[artist.category]}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{artist.displayName}</h1>
              <p className="mt-2 text-muted">{artist.city}</p>
              {artist.bio && <p className="mt-6 max-w-2xl whitespace-pre-line text-muted">{artist.bio}</p>}
              {artist.rateCard && (
                <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                  <div className="font-semibold">Rate card</div>
                  <p className="mt-1 text-muted">{artist.rateCard}</p>
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Request a booking</h2>
              <p className="mt-1 text-sm text-muted">
                Tell {artist.displayName} what you&apos;re planning — they&apos;ll confirm availability
                and final pricing.
              </p>
              <div className="mt-4">
                <BookingRequestForm artistId={artist.id} />
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
