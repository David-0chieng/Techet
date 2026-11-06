import { redirect } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { sendBookingStatusEmail } from "@/lib/notifications";
import type { BookingStatus } from "@/generated/prisma/client";

async function respond(bookingId: string, status: BookingStatus) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingId },
    include: { artist: true },
  });
  if (!booking || booking.artist.userId !== session.user.id) throw new Error("Forbidden");
  if (booking.status !== "PENDING") throw new Error("This request has already been handled.");

  await prisma.bookingRequest.update({ where: { id: bookingId }, data: { status } });
  void sendBookingStatusEmail(bookingId);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/artist");
}

export default async function ArtistDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/artist");

  const artist = await prisma.artistProfile.findUnique({ where: { userId: session.user.id } });
  if (!artist) redirect("/register?role=artist");

  const bookings = await prisma.bookingRequest.findMany({
    where: { artistId: artist.id },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { name: true, email: true } },
      payments: { where: { status: "SUCCEEDED" }, select: { amount: true, platformFee: true } },
    },
  });

  const earned = bookings
    .flatMap((b) => b.payments)
    .reduce((sum, p) => sum + Number(p.amount) - Number(p.platformFee), 0);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">{artist.displayName}</h1>
        <p className="mt-1 text-sm text-muted">Incoming booking requests.</p>

        {earned > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs uppercase tracking-wide text-muted">Deposits earned</div>
            <div className="mt-1 text-2xl font-bold">{formatPrice(String(earned))}</div>
            <p className="mt-1 text-xs text-muted">Your share of confirmed deposits, after the platform fee.</p>
          </div>
        )}

        {bookings.length === 0 ? (
          <p className="mt-8 text-muted">No requests yet — share your artist link to start getting booked.</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{b.eventType}</div>
                    <div className="mt-1 text-xs text-muted">
                      {b.eventDate.toLocaleDateString()} · {formatPrice(String(b.budget))} budget · from{" "}
                      {b.requester.name}
                    </div>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
                    {b.status === "CONFIRMED" ? "CONFIRMED ✓ deposit paid" : b.status}
                  </span>
                </div>
                {b.notes && <p className="mt-2 text-sm text-muted">{b.notes}</p>}
                {b.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <form action={respond.bind(null, b.id, "ACCEPTED")}>
                      <button className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-background">
                        Accept
                      </button>
                    </form>
                    <form action={respond.bind(null, b.id, "DECLINED")}>
                      <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium">
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
