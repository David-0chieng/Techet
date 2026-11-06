import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mpesa/callback/route";
import { prisma } from "@/lib/prisma";
import { sendBookingDepositPaidEmail, sendOrderConfirmationEmail } from "@/lib/notifications";

vi.mock("@/lib/notifications", () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendBookingDepositPaidEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    payment: { findUnique: vi.fn(), updateMany: vi.fn() },
    bookingPayment: { findUnique: vi.fn(), updateMany: vi.fn() },
    bookingRequest: { updateMany: vi.fn() },
    order: { update: vi.fn() },
    ticket: { createMany: vi.fn() },
    ticketType: { update: vi.fn() },
  };
  return {
    prisma: {
      ...tx,
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

const SECRET = "test-callback-secret";

function callbackRequest(stkCallback: unknown, token: string | null = SECRET): Request {
  const url = new URL("http://localhost/api/mpesa/callback");
  if (token) url.searchParams.set("token", token);
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Body: { stkCallback } }),
  });
}

function successPayload(checkoutRequestId: string, amount: number, receipt = "ABC123") {
  return {
    CheckoutRequestID: checkoutRequestId,
    ResultCode: 0,
    ResultDesc: "Success",
    CallbackMetadata: {
      Item: [
        { Name: "Amount", Value: amount },
        { Name: "MpesaReceiptNumber", Value: receipt },
      ],
    },
  };
}

const ticketPayment = {
  id: "pay1",
  status: "PENDING",
  amount: 2000,
  order: {
    id: "order1",
    items: [{ ticketTypeId: "tt1", quantity: 2 }],
  },
};

const depositPayment = {
  id: "bp1",
  bookingId: "bk1",
  status: "PENDING",
  amount: 3000,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MPESA_CALLBACK_SECRET = SECRET;
  prisma.payment.findUnique.mockResolvedValue(null);
  prisma.bookingPayment.findUnique.mockResolvedValue(null);
  prisma.payment.updateMany.mockResolvedValue({ count: 1 });
  prisma.bookingPayment.updateMany.mockResolvedValue({ count: 1 });
  prisma.bookingRequest.updateMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/mpesa/callback", () => {
  it("rejects a missing or forged token", async () => {
    expect((await POST(callbackRequest(successPayload("co1", 2000), null))).status).toBe(403);
    expect((await POST(callbackRequest(successPayload("co1", 2000), "wrong"))).status).toBe(403);
  });

  it("acknowledges unknown checkout ids without touching anything", async () => {
    const res = await POST(callbackRequest(successPayload("unknown", 2000)));
    expect(res.status).toBe(200);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.bookingPayment.updateMany).not.toHaveBeenCalled();
  });

  describe("ticket payments", () => {
    beforeEach(() => {
      prisma.payment.findUnique.mockResolvedValue(ticketPayment);
    });

    it("marks the order paid and issues tickets on success", async () => {
      const res = await POST(callbackRequest(successPayload("co1", 2000)));
      expect(res.status).toBe(200);

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "PAID" } }),
      );
      const createArgs = prisma.ticket.createMany.mock.calls[0][0];
      expect(createArgs.data).toHaveLength(2); // one ticket per quantity
      expect(sendOrderConfirmationEmail).toHaveBeenCalledWith("order1");
    });

    it("fails the payment when the paid amount is short", async () => {
      await POST(callbackRequest(successPayload("co1", 500)));
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "FAILED" }),
        }),
      );
      expect(prisma.ticket.createMany).not.toHaveBeenCalled();
    });

    it("releases stock and cancels the order when the prompt is cancelled", async () => {
      await POST(callbackRequest({ CheckoutRequestID: "co1", ResultCode: 1032, ResultDesc: "Cancelled" }));
      expect(prisma.ticketType.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { sold: { decrement: 2 } } }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "CANCELLED" } }),
      );
    });

    it("ignores duplicate callbacks for settled payments", async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...ticketPayment, status: "SUCCEEDED" });
      const res = await POST(callbackRequest(successPayload("co1", 2000)));
      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("booking deposits", () => {
    beforeEach(() => {
      prisma.bookingPayment.findUnique.mockResolvedValue(depositPayment);
    });

    it("confirms the booking when the deposit lands", async () => {
      const res = await POST(callbackRequest(successPayload("co-dep", 3000)));
      expect(res.status).toBe(200);

      expect(prisma.bookingPayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "SUCCEEDED", mpesaReceipt: "ABC123" }),
        }),
      );
      expect(prisma.bookingRequest.updateMany).toHaveBeenCalledWith({
        where: { id: "bk1", status: "ACCEPTED" },
        data: { status: "CONFIRMED" },
      });
      expect(sendBookingDepositPaidEmail).toHaveBeenCalledWith("bk1");
    });

    it("fails the deposit without confirming when the amount is short", async () => {
      await POST(callbackRequest(successPayload("co-dep", 100)));
      expect(prisma.bookingPayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "FAILED" }),
        }),
      );
      expect(prisma.bookingRequest.updateMany).not.toHaveBeenCalled();
      expect(sendBookingDepositPaidEmail).not.toHaveBeenCalled();
    });

    it("records the failure reason when the prompt is cancelled", async () => {
      await POST(callbackRequest({ CheckoutRequestID: "co-dep", ResultCode: 1032, ResultDesc: "Cancelled by user" }));
      expect(prisma.bookingPayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "FAILED", failureReason: "Cancelled by user" },
        }),
      );
      expect(prisma.bookingRequest.updateMany).not.toHaveBeenCalled();
    });

    it("ignores duplicate callbacks for settled deposits", async () => {
      prisma.bookingPayment.findUnique.mockResolvedValue({ ...depositPayment, status: "SUCCEEDED" });
      const res = await POST(callbackRequest(successPayload("co-dep", 3000)));
      expect(res.status).toBe(200);
      expect(prisma.bookingPayment.updateMany).not.toHaveBeenCalled();
    });
  });
});
