// Artist booking deposit math. Kept free of Prisma imports so it can be unit tested.

export const BOOKING_DEPOSIT_PCT = Number(process.env.BOOKING_DEPOSIT_PCT ?? "30");
export const PLATFORM_FEE_PCT = Number(process.env.PLATFORM_FEE_PCT ?? "10");

export type DepositBreakdown = {
  /** What the requester pays via M-Pesa (whole KES, min 1). */
  deposit: number;
  /** VibeNasi's cut of the deposit. */
  platformFee: number;
  /** What the artist is owed from the deposit. */
  artistNet: number;
};

export function computeBookingDeposit(
  budget: number,
  depositPct: number = BOOKING_DEPOSIT_PCT,
  feePct: number = PLATFORM_FEE_PCT,
): DepositBreakdown {
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error("Budget must be a positive amount.");
  }
  // M-Pesa only moves whole shillings, so round the deposit up to the next shilling.
  const deposit = Math.max(1, Math.ceil(budget * (depositPct / 100)));
  const platformFee = Math.round(deposit * (feePct / 100) * 100) / 100;
  return { deposit, platformFee, artistNet: deposit - platformFee };
}
