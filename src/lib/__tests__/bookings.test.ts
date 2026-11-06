import { describe, expect, it } from "vitest";
import { computeBookingDeposit } from "@/lib/bookings";

describe("computeBookingDeposit", () => {
  it("takes the deposit percentage of the budget and the platform fee from the deposit", () => {
    const { deposit, platformFee, artistNet } = computeBookingDeposit(10_000, 30, 10);
    expect(deposit).toBe(3000);
    expect(platformFee).toBe(300);
    expect(artistNet).toBe(2700);
  });

  it("rounds the deposit up to a whole shilling", () => {
    expect(computeBookingDeposit(1001, 30, 10).deposit).toBe(301); // 300.3 → 301
  });

  it("never drops below KES 1", () => {
    expect(computeBookingDeposit(1, 30, 10).deposit).toBe(1);
  });

  it("rounds the platform fee to cents", () => {
    const { platformFee, artistNet, deposit } = computeBookingDeposit(1005, 30, 10);
    expect(deposit).toBe(302); // 301.5 → 302
    expect(platformFee).toBe(30.2);
    expect(artistNet).toBeCloseTo(271.8, 10);
  });

  it("rejects non-positive or invalid budgets", () => {
    expect(() => computeBookingDeposit(0)).toThrow();
    expect(() => computeBookingDeposit(-50)).toThrow();
    expect(() => computeBookingDeposit(Number.NaN)).toThrow();
  });
});
