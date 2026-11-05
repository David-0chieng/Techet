import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { WeekendGeneratorForm } from "@/components/plan/WeekendGeneratorForm";

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/plan");

  const itineraries = await prisma.itinerary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { crewPlan: { select: { inviteCode: true, status: true } } },
  });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Build my weekend</h1>
          <p className="mt-3 max-w-xl text-muted">
            Pick your vibe, your people, and your budget — we&apos;ll lay out a 2-day plan along the
            coast. Send it to your crew to vote and split costs.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-12">
          <WeekendGeneratorForm />
        </section>

        {itineraries.length > 0 && (
          <section className="mx-auto max-w-3xl px-6 pb-20">
            <h2 className="text-lg font-semibold">Your plans</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {itineraries.map((it) => (
                <li key={it.id}>
                  <Link
                    href={`/plan/${it.shareSlug}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent-2"
                  >
                    <div>
                      <div className="font-semibold">{it.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {it.mood} · {formatPrice(String(it.totalCost))}
                        {it.crewPlan ? ` · Crew: ${it.crewPlan.status}` : ""}
                      </div>
                    </div>
                    <span className="text-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
