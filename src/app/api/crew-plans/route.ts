import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({ itineraryId: z.string().min(1) });

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const itinerary = await prisma.itinerary.findUnique({ where: { id: parsed.data.itineraryId } });
  if (!itinerary || itinerary.userId !== session.user.id) {
    return NextResponse.json({ error: "Itinerary not found." }, { status: 404 });
  }

  const existing = await prisma.crewPlan.findUnique({ where: { itineraryId: itinerary.id } });
  if (existing) return NextResponse.json({ crewPlan: existing });

  const crewPlan = await prisma.crewPlan.create({
    data: {
      itineraryId: itinerary.id,
      inviteCode: generateInviteCode(),
      members: { create: { userId: session.user.id } },
    },
    include: { members: true },
  });

  return NextResponse.json({ crewPlan }, { status: 201 });
}
