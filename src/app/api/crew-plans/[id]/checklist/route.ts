import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addSchema = z.object({ label: z.string().trim().min(1).max(140) });
const toggleSchema = z.object({ itemId: z.string().min(1), done: z.boolean() });

async function requireMember(crewPlanId: string, userId: string) {
  return prisma.crewMember.findUnique({
    where: { crewPlanId_userId: { crewPlanId, userId } },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  if (!(await requireMember(id, session.user.id))) {
    return NextResponse.json({ error: "Join the crew plan to add checklist items." }, { status: 403 });
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a short label." }, { status: 400 });

  const item = await prisma.checklistItem.create({ data: { crewPlanId: id, label: parsed.data.label } });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  if (!(await requireMember(id, session.user.id))) {
    return NextResponse.json({ error: "Join the crew plan first." }, { status: 403 });
  }

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const item = await prisma.checklistItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.crewPlanId !== id) {
    return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
  }

  const updated = await prisma.checklistItem.update({
    where: { id: parsed.data.itemId },
    data: { done: parsed.data.done },
  });
  return NextResponse.json({ item: updated });
}
