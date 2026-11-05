import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const splitSchema = z.object({
  // Optional custom amounts per userId; omit to split the itinerary total evenly across members.
  amounts: z.record(z.string(), z.number().min(0)).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const parsed = splitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const crewPlan = await prisma.crewPlan.findUnique({
    where: { id },
    include: { members: true, itinerary: true },
  });
  if (!crewPlan) return NextResponse.json({ error: "Crew plan not found." }, { status: 404 });
  if (!crewPlan.members.some((m) => m.userId === session.user.id)) {
    return NextResponse.json({ error: "Join the crew plan to split costs." }, { status: 403 });
  }

  const even = Number(crewPlan.itinerary.totalCost) / Math.max(1, crewPlan.members.length);

  const splits = await prisma.$transaction(
    crewPlan.members.map((m) =>
      prisma.costSplit.upsert({
        where: { crewPlanId_userId: { crewPlanId: id, userId: m.userId } },
        update: { amount: parsed.data.amounts?.[m.userId] ?? even },
        create: { crewPlanId: id, userId: m.userId, amount: parsed.data.amounts?.[m.userId] ?? even },
      }),
    ),
  );

  return NextResponse.json({ splits });
}
