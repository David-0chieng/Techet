"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "starting" | "waiting" | "paid" | "failed";

export function BookingDepositCard({
  bookingId,
  depositAmount,
}: {
  bookingId: string;
  depositAmount: number;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "waiting") return;
    timer.current = setInterval(async () => {
      const res = await fetch(`/api/artist-bookings/${bookingId}/deposit`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.bookingStatus === "CONFIRMED") {
        setPhase("paid");
        router.refresh();
      } else if (data.paymentStatus === "FAILED") {
        setPhase("failed");
        setError(data.failureReason ?? "Payment failed. You have not been charged.");
      }
    }, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, bookingId, router]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("starting");
    try {
      const res = await fetch(`/api/artist-bookings/${bookingId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase("idle");
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setPhase("waiting");
    } catch {
      setPhase("idle");
      setError("Network error. Please try again.");
    }
  }

  if (phase === "paid") {
    return (
      <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
        Deposit paid — booking confirmed! 🎉
      </p>
    );
  }

  if (phase === "waiting") {
    return (
      <p className="mt-3 text-sm text-muted">
        Check your phone and enter your M-Pesa PIN. This updates automatically.
      </p>
    );
  }

  return (
    <form onSubmit={pay} className="mt-3 flex flex-col gap-2">
      <p className="text-sm">
        Lock it in with a <strong>KES {depositAmount.toLocaleString()}</strong> deposit via M-Pesa.
      </p>
      <div className="flex gap-2">
        <input
          required
          type="tel"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={phase === "starting"}
          className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {phase === "starting" ? "Starting…" : "Pay deposit"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
