import { z } from "zod";

export const bookingRequestSchema = z.object({
  artistId: z.string().min(1, "Choose an artist"),
  eventDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid event date"),
  eventType: z.string().trim().min(2, "Tell the artist what kind of event this is").max(140),
  budget: z.number().min(0, "Budget can't be negative"),
  notes: z.string().trim().max(1000).optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
