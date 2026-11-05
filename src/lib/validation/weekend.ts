import { z } from "zod";
import { MOODS, type MoodType } from "@/lib/moods";

export const weekendGenerateSchema = z
  .object({
    location: z.string().trim().min(1, "Choose a location").max(100),
    budgetMin: z.number().int().min(0),
    budgetMax: z.number().int().min(0),
    mood: z.enum(MOODS.map((m) => m.key) as [MoodType, ...MoodType[]], { message: "Choose a mood" }),
    groupSize: z.number().int().min(1, "At least 1 person").max(50),
    transport: z.enum(["CAR", "MATATU", "UBER", "WALK"], { message: "Choose a transport mode" }),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, {
    message: "Max budget must be at least the min budget",
    path: ["budgetMax"],
  });

export type WeekendGenerateInput = z.infer<typeof weekendGenerateSchema>;
