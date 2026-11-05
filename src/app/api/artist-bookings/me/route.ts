import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (artistProfile) {
    const bookings = await prisma.bookingRequest.findMany({
      where: { artistId: artistProfile.id },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ role: "ARTIST", bookings });
  }

  const bookings = await prisma.bookingRequest.findMany({
    where: { requesterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { artist: { select: { displayName: true, category: true, city: true } } },
  });
  return NextResponse.json({ role: "REQUESTER", bookings });
}
