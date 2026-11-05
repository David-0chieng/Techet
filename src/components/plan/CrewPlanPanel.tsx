"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

type Member = { userId: string; name: string };
type VoteRow = { userId: string; option: "A" | "B" | "C" };
type SplitRow = { userId: string; name: string; amount: string; paid: boolean };
type ChecklistRow = { id: string; label: string; done: boolean };

export function CrewPlanPanel({
  crewPlanId,
  inviteCode,
  status,
  members,
  votes,
  splits,
  checklist,
  currentUserId,
  isOwner,
}: {
  crewPlanId: string;
  inviteCode: string;
  status: "DRAFT" | "FINAL";
  members: Member[];
  votes: VoteRow[];
  splits: SplitRow[];
  checklist: ChecklistRow[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");

  const myVote = votes.find((v) => v.userId === currentUserId)?.option;
  const voteCounts: Record<"A" | "B" | "C", number> = { A: 0, B: 0, C: 0 };
  for (const v of votes) voteCounts[v.option]++;

  const joinLink = typeof window !== "undefined" ? `${window.location.origin}/plan/join/${inviteCode}` : "";

  async function call(key: string, url: string, body?: unknown) {
    setLoading(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: key === "finalize" || key === "reopen" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      setNewItem("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Crew plan</h2>
          <p className="text-xs text-muted">
            {members.length} {members.length === 1 ? "person" : "people"} · {status === "FINAL" ? "Finalized" : "Draft"}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => call(status === "FINAL" ? "reopen" : "finalize", `/api/crew-plans/${crewPlanId}`, { status: status === "FINAL" ? "DRAFT" : "FINAL" })}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:border-accent-2"
          >
            {status === "FINAL" ? "Reopen as draft" : "Finalize plan"}
          </button>
        )}
      </div>

      {joinLink && (
        <div>
          <span className="text-xs font-medium text-muted">Invite link</span>
          <p className="mt-1 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs">
            {joinLink}
          </p>
        </div>
      )}

      <div>
        <span className="text-sm font-semibold">Vote: which option works?</span>
        <div className="mt-2 flex gap-2">
          {(["A", "B", "C"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={loading !== null}
              onClick={() => call("vote", `/api/crew-plans/${crewPlanId}/votes`, { option: opt })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                myVote === opt
                  ? "border-accent bg-accent text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Option {opt} · {voteCounts[opt]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Split the cost</span>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => call("split", `/api/crew-plans/${crewPlanId}/split`)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Recalculate
          </button>
        </div>
        {splits.length === 0 ? (
          <p className="mt-2 text-xs text-muted">No split yet — hit recalculate to divide the total evenly.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {splits.map((s) => (
              <li key={s.userId} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <span className="font-medium">{formatPrice(s.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <span className="text-sm font-semibold">Checklist</span>
        <ul className="mt-2 flex flex-col gap-1.5">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                disabled={loading !== null}
                onChange={(e) =>
                  call("checklist-toggle", `/api/crew-plans/${crewPlanId}/checklist`, {
                    itemId: item.id,
                    done: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-border accent-[var(--accent)]"
              />
              <span className={item.done ? "text-muted line-through" : ""}>{item.label}</span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItem.trim()) return;
            call("checklist-add", `/api/crew-plans/${crewPlanId}/checklist`, { label: newItem.trim() });
          }}
          className="mt-2 flex gap-2"
        >
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item (e.g. sunscreen)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading !== null || !newItem.trim()}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:border-accent-2 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
