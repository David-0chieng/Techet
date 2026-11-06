import { describe, expect, it } from "vitest";
import { haversineKm, parseCoords, placeDistanceKm, rankEvents, rankPlaces } from "@/lib/discover";

// Mombasa CBD and Nyali are roughly 5 km apart.
const MOMBASA = { lat: -4.0435, lng: 39.6682 };
const NYALI = { lat: -4.0169, lng: 39.7005 };
const DIANI = { lat: -4.2798, lng: 39.5942 };

describe("haversineKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineKm(MOMBASA, MOMBASA)).toBe(0);
  });

  it("matches known coastal distances approximately", () => {
    const km = haversineKm(MOMBASA, NYALI);
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(7);
  });
});

describe("parseCoords", () => {
  it("parses valid string coordinates", () => {
    expect(parseCoords("-4.04", "39.66")).toEqual({ lat: -4.04, lng: 39.66 });
  });

  it("rejects missing, non-numeric, and out-of-range values", () => {
    expect(parseCoords(undefined, "39.66")).toBeNull();
    expect(parseCoords("abc", "39.66")).toBeNull();
    expect(parseCoords("91", "39.66")).toBeNull();
    expect(parseCoords("-4.04", "181")).toBeNull();
  });
});

describe("placeDistanceKm", () => {
  it("returns null without user coords or place coords", () => {
    expect(placeDistanceKm({ lat: -4, lng: 39 }, null)).toBeNull();
    expect(placeDistanceKm({ lat: null, lng: null }, MOMBASA)).toBeNull();
  });
});

describe("rankPlaces", () => {
  const now = Date.now();
  const base = { updatedAt: new Date(now - 30 * 86_400_000) }; // no recency boost

  it("boosts nearby places over equally trending far ones", () => {
    const near = { id: "near", trendingScore: 50, ...base, lat: NYALI.lat, lng: NYALI.lng };
    const far = { id: "far", trendingScore: 50, ...base, lat: DIANI.lat, lng: DIANI.lng };
    const ranked = rankPlaces([far, near], MOMBASA, now);
    expect(ranked[0].id).toBe("near");
  });

  it("falls back to trending order without user coords", () => {
    const a = { id: "a", trendingScore: 10, ...base, lat: null, lng: null };
    const b = { id: "b", trendingScore: 90, ...base, lat: null, lng: null };
    expect(rankPlaces([a, b], null, now)[0].id).toBe("b");
  });
});

describe("rankEvents", () => {
  const now = Date.now();
  const nextMonth = new Date(now + 30 * 86_400_000); // outside the starts-soon boost

  it("boosts events at nearby venues over equally trending far ones", () => {
    const near = { id: "near", trendingScore: 50, startsAt: nextMonth, lat: NYALI.lat, lng: NYALI.lng };
    const far = { id: "far", trendingScore: 50, startsAt: nextMonth, lat: DIANI.lat, lng: DIANI.lng };
    const ranked = rankEvents([far, near], MOMBASA, now);
    expect(ranked[0].id).toBe("near");
  });

  it("still ranks coordinate-less events by trending + starts-soon", () => {
    const soon = {
      id: "soon",
      trendingScore: 50,
      startsAt: new Date(now + 1 * 86_400_000),
      lat: null,
      lng: null,
    };
    const later = { id: "later", trendingScore: 50, startsAt: nextMonth, lat: null, lng: null };
    expect(rankEvents([later, soon], MOMBASA, now)[0].id).toBe("soon");
  });

  it("never lets proximity outweigh a big trending gap beyond the 25-point cap", () => {
    const near = { id: "near", trendingScore: 0, startsAt: nextMonth, lat: MOMBASA.lat, lng: MOMBASA.lng };
    const far = { id: "far", trendingScore: 60, startsAt: nextMonth, lat: DIANI.lat, lng: DIANI.lng };
    expect(rankEvents([near, far], MOMBASA, now)[0].id).toBe("far");
  });
});
