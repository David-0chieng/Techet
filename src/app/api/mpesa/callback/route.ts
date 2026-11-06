import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, sendBookingDepositPaidEmail } from "@/lib/notifications";

type CallbackItem = { Name: string; Value?: string | number };

type StkCallbackPayload = {
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackItem[] };
};

type StkCallback = {
  Body?: {
    stkCallback?: StkCallbackPayload;
  };
};

const ack = () => NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

function validToken(token: string | null): boolean {
  const secret = process.env.MPESA_CALLBACK_SECRET;
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!validToken(url.searchParams.get("token"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as StkCallback | null;
  const callback = body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return ack();

  const payment = await prisma.payment.findUnique({
    where: { checkoutRequestId: callback.CheckoutRequestID },
    include: { order: { include: { items: true } } },
  });
  // Ticket payments and booking deposits share the STK callback; try deposits next.
  if (!payment) return handleBookingDeposit(callback);
  // Already-processed callbacks are acknowledged and ignored (idempotent).
  if (payment.status !== "PENDING") return ack();

  const { order } = payment;

  if (callback.ResultCode !== 0) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "FAILED", failureReason: callback.ResultDesc ?? "Payment failed" },
      });
      if (claimed.count === 0) return;

      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { sold: { decrement: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: callback.ResultCode === 1032 ? "CANCELLED" : "FAILED" },
      });
    });
    return ack();
  }

  const items = callback.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;
  const receipt = String(find("MpesaReceiptNumber") ?? "");
  const paidAmount = Number(find("Amount") ?? 0);
  const amountOk = paidAmount >= Number(payment.amount);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: amountOk ? "SUCCEEDED" : "FAILED",
        mpesaReceipt: receipt || null,
        failureReason: amountOk ? null : `Amount mismatch: paid ${paidAmount}`,
      },
    });
    if (claimed.count === 0) return;

    if (!amountOk) {
      await tx.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
      return;
    }

    await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    await tx.ticket.createMany({
      data: order.items.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          orderId: order.id,
          ticketTypeId: item.ticketTypeId,
          qrCode: randomBytes(16).toString("hex"),
        })),
      ),
    });
  });

  void sendOrderConfirmationEmail(order.id);

  return ack();
}

// Settles a booking deposit payment. Mirrors the ticket flow: claim the PENDING row
// first so duplicate callbacks are idempotent, then confirm the booking on success.
async function handleBookingDeposit(callback: StkCallbackPayload) {
  const payment = await prisma.bookingPayment.findUnique({
    where: { checkoutRequestId: callback.CheckoutRequestID },
  });
  // Unknown or already-processed callbacks are acknowledged and ignored (idempotent).
  if (!payment || payment.status !== "PENDING") return ack();

  if (callback.ResultCode !== 0) {
    await prisma.bookingPayment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", failureReason: callback.ResultDesc ?? "Payment failed" },
    });
    return ack();
  }

  const items = callback.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((i) => i.Name === name)?.Value;
  const receipt = String(find("MpesaReceiptNumber") ?? "");
  const paidAmount = Number(find("Amount") ?? 0);
  const amountOk = paidAmount >= Number(payment.amount);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.bookingPayment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status: amountOk ? "SUCCEEDED" : "FAILED",
        mpesaReceipt: receipt || null,
        failureReason: amountOk ? null : `Amount mismatch: paid ${paidAmount}`,
      },
    });
    if (claimed.count === 0 || !amountOk) return;

    await tx.bookingRequest.updateMany({
      where: { id: payment.bookingId, status: "ACCEPTED" },
      data: { status: "CONFIRMED" },
    });
  });

  if (amountOk) void sendBookingDepositPaidEmail(payment.bookingId);

  return ack();
}
