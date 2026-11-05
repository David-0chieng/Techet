"use client";

import { useState } from "react";

export function SaveSunsetButton({ placeId }: { placeId: string }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (saved || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sunset-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={loading || saved}
      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
        saved
          ? "border-accent bg-accent text-background"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      {saved ? "Saved" : loading ? "Saving…" : "Save"}
    </button>
  );
}
