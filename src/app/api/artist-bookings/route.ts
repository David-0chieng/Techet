import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { track } from "@/lib/analytics";
import { sendBookingRequestCreatedEmail } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to request a booking." }, { status: 401 });
  }

  const parsed = bookingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const artist = await prisma.artistProfile.findUnique({ where: { id: data.artistId } });
  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 });

  const booking = await prisma.bookingRequest.create({
    data: {
      artistId: artist.id,
      requesterId: session.user.id,
      eventDate: new Date(data.eventDate),
      eventType: data.eventType,
      budget: data.budget,
      notes: data.notes,
    },
  });

  void track(
    "artist_booking_requested",
    { artistId: artist.id, bookingId: booking.id },
    session.user.id,
  );
  void sendBookingRequestCreatedEmail(booking.id);

  return NextResponse.json({ booking: { id: booking.id } }, { status: 201 });
}
