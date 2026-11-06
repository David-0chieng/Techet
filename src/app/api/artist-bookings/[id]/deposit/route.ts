import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone, stkPush } from "@/lib/mpesa";
import { computeBookingDeposit } from "@/lib/bookings";

const depositSchema = z.object({ phone: z.string().min(1) });

class DepositError extends Error {}

// Starts an M-Pesa STK push for the booking deposit. Requester-only, booking must be ACCEPTED.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const parsed = depositSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Safaricom number, e.g. 0712345678." },
      { status: 400 },
    );
  }

  const booking = await prisma.bookingRequest.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.requesterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Deposits can only be paid on accepted bookings." },
      { status: 409 },
    );
  }

  const { deposit, platformFee } = computeBookingDeposit(Number(booking.budget));

  // Create the pending payment atomically so concurrent requests can't start two charges.
  let payment: { id: string };
  try {
    payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.bookingPayment.findFirst({
        where: { bookingId: booking.id, status: { in: ["PENDING", "SUCCEEDED"] } },
      });
      if (existing) throw new DepositError("A deposit payment is already in progress or paid.");
      return tx.bookingPayment.create({
        data: { bookingId: booking.id, amount: deposit, platformFee, phone },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof DepositError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  try {
    const result = await stkPush({
      phone,
      amount: deposit,
      reference: booking.id.slice(-8),
      description: "VibeNasi",
    });
    await prisma.bookingPayment.update({
      where: { id: payment.id },
      data: { checkoutRequestId: result.checkoutRequestId, providerRef: result.merchantRequestId },
    });
  } catch (error) {
    await prisma.bookingPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "STK push failed",
      },
    });
    return NextResponse.json(
      { error: "Could not start M-Pesa payment. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ paymentId: payment.id, amount: deposit });
}

// Poll endpoint for the deposit card: latest payment + booking status.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      artist: { select: { userId: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.requesterId !== session.user.id && booking.artist.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const latest = booking.payments[0];
  return NextResponse.json({
    bookingStatus: booking.status,
    paymentStatus: latest?.status ?? null,
    failureReason: latest?.failureReason ?? null,
  });
}
