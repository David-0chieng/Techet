import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Major product analytics events we track across the new VibeNasi surfaces.
export type AnalyticsEvent =
  | "mood_selected"
  | "weekend_generated"
  | "crew_vote_cast"
  | "map_spot_opened"
  | "sunset_spot_saved"
  | "artist_booking_requested";

// Best-effort event tracking, reusing AuditLog so we don't need a new table.
// Never throws — analytics must never break the user-facing request.
export async function track(
  event: AnalyticsEvent,
  metadata?: Record<string, unknown>,
  userId?: string | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action: event,
        entity: "analytics",
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // swallow — analytics failures must never break the request
  }
}
