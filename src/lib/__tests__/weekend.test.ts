import { describe, expect, it } from "vitest";
import {
  buildWeekendPlan,
  type WeekendCandidateEvent,
  type WeekendCandidatePlace,
  type WeekendInput,
} from "@/lib/weekend";

const input: WeekendInput = {
  location: "Mombasa",
  budgetMin: 0,
  budgetMax: 100_000,
  mood: "chill",
  groupSize: 2,
  transport: "MATATU",
};

function place(overrides: Partial<WeekendCandidatePlace> & { id: string }): WeekendCandidatePlace {
  return {
    name: overrides.id,
    category: "FOOD",
    city: "Mombasa",
    priceLevel: 1,
    trendingScore: 10,
    ...overrides,
  };
}

const headliner: WeekendCandidateEvent = {
  id: "ev1",
  title: "Sunset Sessions",
  city: "Mombasa",
  fromPrice: 1000,
  trendingScore: 80,
};

describe("buildWeekendPlan", () => {
  it("fills all six blocks across two days", () => {
    const plan = buildWeekendPlan(input, [place({ id: "p1" }), place({ id: "p2" })], []);
    expect(plan.items).toHaveLength(6);
    const keys = plan.items.map((i) => `${i.day}:${i.block}`);
    expect(new Set(keys).size).toBe(6);
  });

  it("slots the most trending event into day-1 night at group price", () => {
    const plan = buildWeekendPlan(input, [], [headliner, { ...headliner, id: "ev2", trendingScore: 5 }]);
    const night1 = plan.items.find((i) => i.day === 1 && i.block === "night");
    expect(night1?.eventId).toBe("ev1");
    expect(night1?.estCost).toBe(2000); // 1000 × groupSize 2
  });

  it("never uses the same place twice", () => {
    const places = ["p1", "p2", "p3"].map((id) => place({ id }));
    const plan = buildWeekendPlan(input, places, []);
    const used = plan.items.map((i) => i.placeId).filter(Boolean);
    expect(new Set(used).size).toBe(used.length);
  });

  it("fills empty blocks with free time at zero cost", () => {
    const plan = buildWeekendPlan(input, [], []);
    expect(plan.items.every((i) => i.title.includes("Free time") && i.estCost === 0)).toBe(true);
    expect(plan.totalCost).toBe(0);
  });

  it("trims the costliest places to fit the budget but keeps the event", () => {
    const places = [
      place({ id: "cheap", priceLevel: 1 }), // 500 × 2 = 1000
      place({ id: "pricey", priceLevel: 4 }), // 6000 × 2 = 12000
    ];
    const tightBudget = { ...input, budgetMax: 5000 };
    const plan = buildWeekendPlan(tightBudget, places, [headliner]);

    expect(plan.totalCost).toBeLessThanOrEqual(5000);
    // The event survives trimming.
    expect(plan.items.some((i) => i.eventId === "ev1")).toBe(true);
    // The pricey place got skipped, not silently dropped.
    const skipped = plan.items.find((i) => i.title.includes("skip to stay in budget"));
    expect(skipped).toBeDefined();
    expect(skipped?.estCost).toBe(0);
  });

  it("summarises the route with the real stop count", () => {
    const plan = buildWeekendPlan(input, [place({ id: "p1" })], [headliner]);
    expect(plan.routeSummary).toContain("2 stops");
    expect(plan.routeSummary).toContain("Mombasa");
    expect(plan.routeSummary).toContain("matatu");
  });
});
