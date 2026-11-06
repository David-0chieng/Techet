import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendCrewJoinEmail } from "@/lib/notifications";

const joinSchema = z.object({ inviteCode: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite code." }, { status: 400 });

  const crewPlan = await prisma.crewPlan.findUnique({ where: { inviteCode: parsed.data.inviteCode } });
  if (!crewPlan) return NextResponse.json({ error: "That invite link isn't valid." }, { status: 404 });

  const alreadyMember = await prisma.crewMember.findUnique({
    where: { crewPlanId_userId: { crewPlanId: crewPlan.id, userId: session.user.id } },
  });

  await prisma.crewMember.upsert({
    where: { crewPlanId_userId: { crewPlanId: crewPlan.id, userId: session.user.id } },
    update: {},
    create: { crewPlanId: crewPlan.id, userId: session.user.id },
  });

  if (!alreadyMember) void sendCrewJoinEmail(crewPlan.id, session.user.id);

  return NextResponse.json({ crewPlanId: crewPlan.id });
}
