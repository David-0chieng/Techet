import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/artist-bookings/[id]/deposit/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stkPush } from "@/lib/mpesa";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/mpesa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mpesa")>();
  return { ...actual, stkPush: vi.fn() };
});

vi.mock("@/lib/prisma", () => {
  const tx = {
    bookingRequest: { findUnique: vi.fn() },
    bookingPayment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return {
    prisma: {
      ...tx,
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

const mockedAuth = vi.mocked(auth);
const mockedStkPush = vi.mocked(stkPush);

const params = Promise.resolve({ id: "bk1" });

const acceptedBooking = {
  id: "bk1",
  requesterId: "user1",
  status: "ACCEPTED",
  budget: 10_000,
};

function depositRequest(phone = "0712345678"): Request {
  return new Request("http://localhost/api/artist-bookings/bk1/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: "user1" } } as never);
  prisma.bookingRequest.findUnique.mockResolvedValue(acceptedBooking);
  prisma.bookingPayment.findFirst.mockResolvedValue(null);
  prisma.bookingPayment.create.mockResolvedValue({ id: "bp1" });
  mockedStkPush.mockResolvedValue({ merchantRequestId: "mr1", checkoutRequestId: "co1" });
});

describe("POST /api/artist-bookings/[id]/deposit", () => {
  it("requires sign-in", async () => {
    mockedAuth.mockResolvedValue(null as never);
    expect((await POST(depositRequest(), { params })).status).toBe(401);
  });

  it("only lets the requester pay", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "someone-else" } } as never);
    expect((await POST(depositRequest(), { params })).status).toBe(403);
  });

  it("rejects bookings that aren't accepted yet", async () => {
    prisma.bookingRequest.findUnique.mockResolvedValue({ ...acceptedBooking, status: "PENDING" });
    expect((await POST(depositRequest(), { params })).status).toBe(409);
  });

  it("rejects invalid phone numbers", async () => {
    expect((await POST(depositRequest("12345"), { params })).status).toBe(400);
    expect(mockedStkPush).not.toHaveBeenCalled();
  });

  it("creates a 30% deposit payment with the 10% platform fee and starts the STK push", async () => {
    const res = await POST(depositRequest(), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ paymentId: "bp1", amount: 3000 });

    expect(prisma.bookingPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "bk1",
          amount: 3000, // 30% of 10,000
          platformFee: 300, // 10% of the deposit
          phone: "254712345678",
        }),
      }),
    );
    expect(mockedStkPush).toHaveBeenCalledWith(expect.objectContaining({ amount: 3000 }));
    expect(prisma.bookingPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ checkoutRequestId: "co1" }),
      }),
    );
  });

  it("blocks a second charge while one is pending or paid", async () => {
    prisma.bookingPayment.findFirst.mockResolvedValue({ id: "existing" });
    const res = await POST(depositRequest(), { params });
    expect(res.status).toBe(409);
    expect(prisma.bookingPayment.create).not.toHaveBeenCalled();
    expect(mockedStkPush).not.toHaveBeenCalled();
  });

  it("fails the payment when the STK push can't start", async () => {
    mockedStkPush.mockRejectedValue(new Error("Safaricom down"));
    const res = await POST(depositRequest(), { params });
    expect(res.status).toBe(502);
    expect(prisma.bookingPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", failureReason: "Safaricom down" }),
      }),
    );
  });
});
