import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBookingStatusEmail } from "@/lib/notifications";

const statusSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const booking = await prisma.bookingRequest.findUnique({
    where: { id },
    include: { artist: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const isArtistOwner = booking.artist.userId === session.user.id;
  const isRequester = booking.requesterId === session.user.id;
  if (!isArtistOwner && !isRequester) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Only the artist can accept/decline; the requester may only cancel their own request.
  if (parsed.data.status !== "CANCELLED" && !isArtistOwner) {
    return NextResponse.json({ error: "Only the artist can respond to this request." }, { status: 403 });
  }

  const updated = await prisma.bookingRequest.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  void sendBookingStatusEmail(updated.id);

  return NextResponse.json({ booking: { id: updated.id, status: updated.status } });
}
