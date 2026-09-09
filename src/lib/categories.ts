export const CATEGORIES = [
  { id: "food", label: "Food", glyph: "🍽️", tint: "#FF9F0A" },
  { id: "flights", label: "Flights", glyph: "✈️", tint: "#0A84FF" },
  { id: "hotels", label: "Hotels", glyph: "🏨", tint: "#5E5CE6" },
  { id: "transport", label: "Transport", glyph: "🚆", tint: "#30D158" },
  { id: "fun", label: "Fun", glyph: "🎉", tint: "#FF375F" },
  { id: "shopping", label: "Shopping", glyph: "🛍️", tint: "#BF5AF2" },
  { id: "other", label: "Other", glyph: "•••", tint: "#8E8E93" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS: Category[] = CATEGORIES.map((c) => c.id);

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryInfo(id: Category) {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isCategory(value: string): value is Category {
  return BY_ID.has(value as Category);
}

/** Resolve a loose CSV value ("Food", "food", "FOOD") to a Category. */
export function parseCategory(value: string): Category | undefined {
  const needle = value.trim().toLowerCase();
  if (isCategory(needle)) return needle;
  return CATEGORIES.find((c) => c.label.toLowerCase() === needle)?.id;
}
