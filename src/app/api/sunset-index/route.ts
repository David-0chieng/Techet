import { NextResponse } from "next/server";
import { z } from "zod";
import { getSunsetIndex } from "@/lib/sunset";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location");

  const spots = await getSunsetIndex({ location });
  return NextResponse.json({ spots });
}

const saveSchema = z.object({ placeId: z.string().min(1) });

// "Saving" a sunset pick records a SAVE vibe signal (feeds the vibe map too) and logs analytics.
export async function POST(request: Request) {
  const session = await auth();
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const place = await prisma.place.findUnique({ where: { id: parsed.data.placeId } });
  if (!place) return NextResponse.json({ error: "Spot not found." }, { status: 404 });

  await prisma.vibeSignal.create({ data: { placeId: place.id, type: "SAVE" } });
  void track("sunset_spot_saved", { placeId: place.id }, session?.user?.id);

  return NextResponse.json({ ok: true });
}
