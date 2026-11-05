import Link from "next/link";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { getVibeMap, type CrowdLevel } from "@/lib/vibemap";
import { getSunsetIndex } from "@/lib/sunset";
import { SaveSunsetButton } from "@/components/map/SaveSunsetButton";
import { track } from "@/lib/analytics";
import { auth } from "@/lib/auth";

const CROWD_LABEL: Record<CrowdLevel, string> = { low: "Chill", medium: "Filling up", high: "Packed" };
const CROWD_CLASS: Record<CrowdLevel, string> = {
  low: "border-border text-muted",
  medium: "border-accent-2 text-accent-2",
  high: "border-accent text-accent",
};

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const { location, tab: tabParam, spot } = await searchParams;
  const locationFilter = typeof location === "string" ? location : null;
  const tab = tabParam === "sunset" ? "sunset" : "vibe";

  if (typeof spot === "string") {
    const session = await auth();
    void track("map_spot_opened", { spotId: spot }, session?.user?.id);
  }

  const [spots, sunsetPicks] = await Promise.all([
    getVibeMap({ location: locationFilter }),
    getSunsetIndex({ location: locationFilter }),
  ]);

  const tabHref = (next: "vibe" | "sunset") =>
    `/map?tab=${next}${locationFilter ? `&location=${encodeURIComponent(locationFilter)}` : ""}`;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hot near you</h1>
          <p className="mt-3 max-w-xl text-muted">
            Live vibe check across the coast, plus today&apos;s best golden hour picks.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-6">
          <div className="flex gap-2">
            <Link
              href={tabHref("vibe")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "vibe"
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Live Vibe Map
            </Link>
            <Link
              href={tabHref("sunset")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "sunset"
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Golden hour picks
            </Link>
          </div>
        </section>

        {tab === "vibe" ? (
          <section className="mx-auto max-w-6xl px-6 pb-20">
            {spots.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nothing trending yet — check back soon.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {spots.map((s) => (
                  <li key={`${s.kind}-${s.id}`}>
                    <Link
                      href={`/map?tab=vibe&spot=${s.id}${locationFilter ? `&location=${encodeURIComponent(locationFilter)}` : ""}`}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted">
                          {s.category}
                        </span>
                        {s.happeningNow && (
                          <span className="rounded-full border border-accent px-2 py-0.5 text-[11px] font-semibold text-accent">
                            Happening now
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold">{s.name}</h3>
                      <p className="text-xs text-muted">{s.city}</p>
                      <span
                        className={`inline-block w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${CROWD_CLASS[s.crowdLevel]}`}
                      >
                        {CROWD_LABEL[s.crowdLevel]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="mx-auto max-w-6xl px-6 pb-20">
            {sunsetPicks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No sunset picks for today yet — check back soon.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sunsetPicks.map((s) => (
                  <li key={s.placeId} className="rounded-xl border border-border bg-surface p-4">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="mt-1 text-xs text-muted">{s.city}</p>
                    <p className="mt-2 text-sm">
                      Best window: <span className="font-medium">{s.bestWindow}</span>
                    </p>
                    {s.cloudHint && <p className="mt-1 text-xs text-muted">{s.cloudHint}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-accent-2">
                        Photo score {Math.round(s.photoScore)}
                      </span>
                      <SaveSunsetButton placeId={s.placeId} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
