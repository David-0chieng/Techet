import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { BookingDepositCard } from "@/components/artist/BookingDepositCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeBookingDeposit } from "@/lib/bookings";
import { formatPrice, formatEventDate } from "@/lib/format";

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fbookings");

  const [orders, artistBookings] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { event: { select: { title: true, slug: true, startsAt: true } } },
    }),
    prisma.bookingRequest.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { artist: { select: { displayName: true, category: true, city: true } } },
    }),
  ]);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
        <p className="mt-2 text-sm text-muted">Every order and ticket you&apos;ve copped on VibeNasi.</p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-muted">Nothing here yet — your calendar is wide open.</p>
            <Link href="/events" className="mt-4 inline-block text-sm font-medium text-accent">
              See what&apos;s on
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent-2"
                >
                  <div>
                    <div className="font-semibold">{order.event.title}</div>
                    <div className="mt-1 text-xs text-muted">
                      {formatEventDate(order.event.startsAt)} · {formatPrice(String(order.totalAmount))}
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                    {order.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {artistBookings.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight">Artist bookings</h2>
            <p className="mt-1 text-sm text-muted">
              Your booking requests to DJs, MCs, photographers, and more.
            </p>
            <ul className="mt-5 flex flex-col gap-3">
              {artistBookings.map((b) => (
                <li key={b.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{b.artist.displayName}</div>
                      <div className="mt-1 text-xs text-muted">
                        {b.eventType} · {formatEventDate(b.eventDate)} ·{" "}
                        {formatPrice(String(b.budget))} budget
                      </div>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                      {b.status === "CONFIRMED" ? "CONFIRMED ✓" : b.status}
                    </span>
                  </div>
                  {b.status === "ACCEPTED" && (
                    <BookingDepositCard
                      bookingId={b.id}
                      depositAmount={computeBookingDeposit(Number(b.budget)).deposit}
                    />
                  )}
                  {b.status === "CONFIRMED" && (
                    <p className="mt-2 text-sm text-accent">
                      Deposit paid — the artist will reach out to finalise details.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
