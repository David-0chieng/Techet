"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function NearMeButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = searchParams.has("lat") && searchParams.has("lng");

  function navigate(params: URLSearchParams) {
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/discover?${query}` : "/discover");
    });
  }

  function toggle() {
    setError(null);

    if (active) {
      const params = new URLSearchParams(searchParams);
      params.delete("lat");
      params.delete("lng");
      navigate(params);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const params = new URLSearchParams(searchParams);
        // ~11 m precision is plenty for ranking and avoids leaking an exact position into the URL.
        params.set("lat", position.coords.latitude.toFixed(4));
        params.set("lng", position.coords.longitude.toFixed(4));
        navigate(params);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it to see what's near you."
            : "Couldn't get your location. Try again.",
        );
      },
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={locating}
        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          active
            ? "border-accent bg-accent text-background"
            : "border-border text-muted hover:text-foreground"
        }`}
      >
        {locating ? "Locating…" : active ? "📍 Near me · on" : "📍 Near me"}
      </button>
      {error && <span className="text-xs text-muted">{error}</span>}
    </div>
  );
}
