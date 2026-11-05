import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const toggleSchema = z.object({ done: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id, itemId } = await params;
  const member = await prisma.crewMember.findUnique({
    where: { crewPlanId_userId: { crewPlanId: id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Join the crew plan first." }, { status: 403 });

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  if (!item || item.crewPlanId !== id) {
    return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
  }

  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { done: parsed.data.done },
  });

  return NextResponse.json({ item: updated });
}
