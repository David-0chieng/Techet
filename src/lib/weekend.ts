import type { MoodType } from "./moods";

export type WeekendBlockName = "morning" | "afternoon" | "night";

export type WeekendCandidatePlace = {
  id: string;
  name: string;
  category: "FOOD" | "ACTIVITY" | "VIEWPOINT" | "NIGHTLIFE" | "OTHER";
  city: string;
  priceLevel: number; // 1-4
  trendingScore: number;
};

export type WeekendCandidateEvent = {
  id: string;
  title: string;
  city: string | null;
  fromPrice: number | null;
  trendingScore: number;
};

export type WeekendInput = {
  location: string;
  budgetMin: number;
  budgetMax: number;
  mood: MoodType;
  groupSize: number;
  transport: "CAR" | "MATATU" | "UBER" | "WALK";
};

export type WeekendItem = {
  day: 1 | 2;
  block: WeekendBlockName;
  title: string;
  placeId?: string;
  eventId?: string;
  estCost: number;
  sortOrder: number;
};

export type WeekendPlan = {
  items: WeekendItem[];
  totalCost: number;
  routeSummary: string;
};

// Rough per-person KES estimate per priceLevel band — places don't store real prices (v1 estimate).
const PRICE_LEVEL_KES: Record<number, number> = { 1: 500, 2: 1500, 3: 3000, 4: 6000 };

// Preferred place categories for each time block, in priority order.
const BLOCK_CATEGORY_PREFERENCE: Record<WeekendBlockName, WeekendCandidatePlace["category"][]> = {
  morning: ["FOOD", "ACTIVITY", "VIEWPOINT"],
  afternoon: ["ACTIVITY", "VIEWPOINT", "FOOD"],
  night: ["NIGHTLIFE", "FOOD", "ACTIVITY"],
};

const BLOCKS: { day: 1 | 2; block: WeekendBlockName }[] = [
  { day: 1, block: "morning" },
  { day: 1, block: "afternoon" },
  { day: 1, block: "night" },
  { day: 2, block: "morning" },
  { day: 2, block: "afternoon" },
  { day: 2, block: "night" },
];

/**
 * Builds a 2-day, 6-block itinerary from mood-matching places (and optionally one headline
 * event), then trims the lowest-priority items until the total fits budgetMax. Pure function —
 * easy to unit test; DB fetching/persistence happens in the API route.
 */
export function buildWeekendPlan(
  input: WeekendInput,
  places: WeekendCandidatePlace[],
  events: WeekendCandidateEvent[],
): WeekendPlan {
  const used = new Set<string>();
  const items: WeekendItem[] = [];

  // Slot the single best-matching event into Friday night, if one exists.
  const headlineEvent = [...events].sort((a, b) => b.trendingScore - a.trendingScore)[0];
  if (headlineEvent) {
    items.push({
      day: 1,
      block: "night",
      title: headlineEvent.title,
      eventId: headlineEvent.id,
      estCost: (headlineEvent.fromPrice ?? 0) * input.groupSize,
      sortOrder: 0,
    });
    used.add(`event:${headlineEvent.id}`);
  }

  for (const slot of BLOCKS) {
    if (items.some((i) => i.day === slot.day && i.block === slot.block)) continue;

    const preference = BLOCK_CATEGORY_PREFERENCE[slot.block];
    const candidate = [...places]
      .filter((p) => !used.has(`place:${p.id}`))
      .sort((a, b) => {
        const aRank = preference.indexOf(a.category);
        const bRank = preference.indexOf(b.category);
        const aPref = aRank === -1 ? preference.length : aRank;
        const bPref = bRank === -1 ? preference.length : bRank;
        if (aPref !== bPref) return aPref - bPref;
        return b.trendingScore - a.trendingScore;
      })[0];

    if (!candidate) {
      items.push({
        day: slot.day,
        block: slot.block,
        title: "Free time — explore on your own",
        estCost: 0,
        sortOrder: items.length,
      });
      continue;
    }

    used.add(`place:${candidate.id}`);
    items.push({
      day: slot.day,
      block: slot.block,
      title: candidate.name,
      placeId: candidate.id,
      estCost: (PRICE_LEVEL_KES[candidate.priceLevel] ?? 1000) * input.groupSize,
      sortOrder: items.length,
    });
  }

  // Trim the costliest optional (non-event) items until we fit budgetMax.
  let totalCost = items.reduce((sum, i) => sum + i.estCost, 0);
  const trimmable = [...items]
    .filter((i) => !i.eventId && i.estCost > 0)
    .sort((a, b) => b.estCost - a.estCost);

  for (const item of trimmable) {
    if (totalCost <= input.budgetMax) break;
    const idx = items.findIndex((i) => i === item);
    if (idx === -1) continue;
    totalCost -= item.estCost;
    items[idx] = { ...item, title: `${item.title} (skip to stay in budget)`, estCost: 0, placeId: undefined };
  }

  const stopCount = items.filter((i) => i.placeId || i.eventId).length;
  const routeSummary = `${stopCount} stop${stopCount === 1 ? "" : "s"} around ${input.location}, getting around by ${input.transport.toLowerCase()}.`;

  const blockOrder = (day: 1 | 2, block: WeekendBlockName) =>
    day * 10 + BLOCKS.findIndex((b) => b.block === block);

  return {
    items: [...items].sort((a, b) => blockOrder(a.day, a.block) - blockOrder(b.day, b.block)),
    totalCost,
    routeSummary,
  };
}
