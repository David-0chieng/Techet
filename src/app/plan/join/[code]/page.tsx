import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function JoinCrewPlanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/plan/join/${code}`)}`);

  const crewPlan = await prisma.crewPlan.findUnique({
    where: { inviteCode: code },
    include: { itinerary: { select: { shareSlug: true } } },
  });
  if (!crewPlan) redirect("/plan");

  await prisma.crewMember.upsert({
    where: { crewPlanId_userId: { crewPlanId: crewPlan.id, userId: session.user.id } },
    update: {},
    create: { crewPlanId: crewPlan.id, userId: session.user.id },
  });

  redirect(`/plan/${crewPlan.itinerary.shareSlug}`);
}
