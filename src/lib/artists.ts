export const ARTIST_CATEGORIES = [
  "DJ",
  "MC",
  "PHOTOGRAPHER",
  "DANCER",
  "BAND",
  "OTHER",
] as const;

export type ArtistCategoryType = (typeof ARTIST_CATEGORIES)[number];

export const ARTIST_CATEGORY_LABEL: Record<ArtistCategoryType, string> = {
  DJ: "DJ",
  MC: "MC / Host",
  PHOTOGRAPHER: "Photographer",
  DANCER: "Dancer",
  BAND: "Band",
  OTHER: "Other",
};
