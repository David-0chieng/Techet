import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/checkout/route";
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
    event: { findUnique: vi.fn() },
    ticketType: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn() },
    payment: { updateMany: vi.fn() },
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

function checkoutRequest(body: unknown): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventId: "evt1",
  phone: "0712345678",
  items: [{ ticketTypeId: "tt1", quantity: 2 }],
};

const publishedEvent = { id: "evt1", status: "PUBLISHED", externalUrl: null };
const ticketType = { id: "tt1", eventId: "evt1", name: "General", price: 1000, quantity: 100, sold: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: "user1" } } as never);
  prisma.event.findUnique.mockResolvedValue(publishedEvent);
  prisma.ticketType.findUnique.mockResolvedValue(ticketType);
  prisma.ticketType.updateMany.mockResolvedValue({ count: 1 });
  prisma.order.create.mockResolvedValue({ id: "order1", totalAmount: 2000 });
  prisma.payment.updateMany.mockResolvedValue({ count: 1 });
  prisma.orderItem.findMany.mockResolvedValue([{ ticketTypeId: "tt1", quantity: 2 }]);
  mockedStkPush.mockResolvedValue({ merchantRequestId: "mr1", checkoutRequestId: "co1" });
});

describe("POST /api/checkout", () => {
  it("requires sign-in", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid phone number", async () => {
    const res = await POST(checkoutRequest({ ...validBody, phone: "12345" }));
    expect(res.status).toBe(400);
    expect(mockedStkPush).not.toHaveBeenCalled();
  });

  it("creates the order and starts an STK push for the DB-priced total", async () => {
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orderId: "order1" });

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAmount: 2000, // 2 × KES 1000 from the DB, not the client
        }),
      }),
    );
    expect(mockedStkPush).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2000, phone: "254712345678" }),
    );
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ checkoutRequestId: "co1" }),
      }),
    );
  });

  it("rejects externally ticketed events", async () => {
    prisma.event.findUnique.mockResolvedValue({ ...publishedEvent, externalUrl: "https://x.co" });
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("rejects unpublished events", async () => {
    prisma.event.findUnique.mockResolvedValue({ ...publishedEvent, status: "DRAFT" });
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 409 when stock runs out", async () => {
    prisma.ticketType.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("General");
  });

  it("releases the order when the STK push fails", async () => {
    mockedStkPush.mockRejectedValue(new Error("Safaricom down"));
    const res = await POST(checkoutRequest(validBody));
    expect(res.status).toBe(502);

    // Reserved stock is handed back and the order+payment are failed.
    expect(prisma.ticketType.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sold: { decrement: 2 } } }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } }),
    );
  });
});
