import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { SendToCrewButton } from "@/components/plan/SendToCrewButton";
import { CrewPlanPanel } from "@/components/plan/CrewPlanPanel";

const BLOCK_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", night: "Night" };

export default async function ItineraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/plan/${slug}`)}`);

  const itinerary = await prisma.itinerary.findUnique({
    where: { shareSlug: slug },
    include: {
      items: { orderBy: [{ day: "asc" }, { sortOrder: "asc" }] },
      crewPlan: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          votes: true,
          splits: { include: { user: { select: { name: true } } } },
          checklist: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!itinerary) notFound();

  const isOwner = itinerary.userId === session.user.id;
  const isCrewMember = itinerary.crewPlan?.members.some((m) => m.userId === session.user.id) ?? false;
  if (!isOwner && !isCrewMember) notFound();

  const byDay = new Map<number, typeof itinerary.items>();
  for (const item of itinerary.items) {
    byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-8">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent">
            {itinerary.location} · {itinerary.mood.replace("_", " ")}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{itinerary.title}</h1>
          <p className="mt-3 text-muted">
            Est. total <span className="font-semibold text-foreground">{formatPrice(String(itinerary.totalCost))}</span>{" "}
            for {itinerary.groupSize} {itinerary.groupSize === 1 ? "person" : "people"}
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-24 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-8">
            {[1, 2].map((day) => (
              <div key={day}>
                <h2 className="text-lg font-semibold">Day {day}</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {(byDay.get(day) ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-accent-2">
                          {BLOCK_LABEL[item.block] ?? item.block}
                        </span>
                        <span className="text-xs text-muted">{formatPrice(String(item.estCost))}</span>
                      </div>
                      <p className="mt-1 font-medium">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="flex flex-col gap-4">
            {itinerary.crewPlan ? (
              <CrewPlanPanel
                crewPlanId={itinerary.crewPlan.id}
                inviteCode={itinerary.crewPlan.inviteCode}
                status={itinerary.crewPlan.status}
                members={itinerary.crewPlan.members.map((m) => ({ userId: m.userId, name: m.user.name }))}
                votes={itinerary.crewPlan.votes.map((v) => ({ userId: v.userId, option: v.option }))}
                splits={itinerary.crewPlan.splits.map((s) => ({
                  userId: s.userId,
                  name: s.user.name,
                  amount: s.amount.toString(),
                  paid: s.paid,
                }))}
                checklist={itinerary.crewPlan.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done }))}
                currentUserId={session.user.id}
                isOwner={isOwner}
              />
            ) : (
              isOwner && (
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <h2 className="text-lg font-semibold">Plan it with your crew</h2>
                  <p className="mt-2 text-sm text-muted">
                    Invite friends to vote, split the cost, and build a shared checklist.
                  </p>
                  <div className="mt-4">
                    <SendToCrewButton itineraryId={itinerary.id} />
                  </div>
                </div>
              )
            )}
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}
