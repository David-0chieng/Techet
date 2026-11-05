export const MOODS = [
  { key: "chill", label: "Chill", emoji: "🌴" },
  { key: "turn_up", label: "Turn Up", emoji: "🔥" },
  { key: "romantic", label: "Romantic", emoji: "🌅" },
  { key: "budget", label: "Budget", emoji: "💸" },
] as const;

export type MoodType = (typeof MOODS)[number]["key"];
