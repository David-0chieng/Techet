"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOODS, type MoodType } from "@/lib/moods";

const LOCATIONS = ["Mombasa", "Diani", "Watamu"];
const TRANSPORTS = [
  { value: "CAR", label: "Car" },
  { value: "MATATU", label: "Matatu" },
  { value: "UBER", label: "Uber" },
  { value: "WALK", label: "Walk" },
] as const;

export function WeekendGeneratorForm() {
  const router = useRouter();
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [budgetMin, setBudgetMin] = useState(2000);
  const [budgetMax, setBudgetMax] = useState(10000);
  const [mood, setMood] = useState<MoodType>(MOODS[0].key);
  const [groupSize, setGroupSize] = useState(2);
  const [transport, setTransport] = useState<(typeof TRANSPORTS)[number]["value"]>("UBER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/weekend/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, budgetMin, budgetMax, mood, groupSize, transport }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=/plan");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't build a plan. Try different filters.");
        return;
      }
      router.push(`/plan/${data.itinerary.shareSlug}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6">
      <label className="flex flex-col gap-1.5 text-sm">
        Location
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        <span className="text-sm">What&apos;s the vibe?</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMood(m.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                mood === m.key
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          Budget min (KES)
          <input
            type="number"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Budget max (KES)
          <input
            type="number"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Group size
          <input
            type="number"
            min={1}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Getting around
          <select
            value={transport}
            onChange={(e) => setTransport(e.target.value as typeof transport)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {TRANSPORTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Building your weekend…" : "Build my weekend"}
      </button>
    </form>
  );
}
