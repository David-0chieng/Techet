import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ status: z.enum(["DRAFT", "FINAL"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const member = await prisma.crewMember.findUnique({
    where: { crewPlanId_userId: { crewPlanId: id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Join the crew plan first." }, { status: 403 });

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.crewPlan.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ crewPlan: { id: updated.id, status: updated.status } });
}
