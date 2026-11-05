import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

const voteSchema = z.object({ option: z.enum(["A", "B", "C"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose option A, B, or C." }, { status: 400 });

  const member = await prisma.crewMember.findUnique({
    where: { crewPlanId_userId: { crewPlanId: id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Join the crew plan to vote." }, { status: 403 });

  const vote = await prisma.vote.upsert({
    where: { crewPlanId_userId: { crewPlanId: id, userId: session.user.id } },
    update: { option: parsed.data.option },
    create: { crewPlanId: id, userId: session.user.id, option: parsed.data.option },
  });

  void track("crew_vote_cast", { crewPlanId: id, option: parsed.data.option }, session.user.id);

  return NextResponse.json({ vote });
}
