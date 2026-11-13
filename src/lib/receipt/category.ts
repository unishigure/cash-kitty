export const categories = [
  "食費",
  "日用品",
  "衣服",
  "趣味",
  "交通",
  "交際",
  "医療",
  "住居",
  "光熱費",
  "通信",
  "税金",
  "貯蓄",
  "その他",
] as const;

export type Category = (typeof categories)[number];

const legacyCategories: Record<string, Category> = {
  外食: "食費",
  娯楽: "趣味",
  交通費: "交通",
  交際費: "交際",
  医療費: "医療",
  住居費: "住居",
  通信費: "通信",
};

export function isCategory(value: unknown): value is Category {
  return (categories as readonly unknown[]).includes(value);
}

export function toCategory(value: unknown): Category {
  if (isCategory(value)) return value;
  if (typeof value !== "string" || !Object.hasOwn(legacyCategories, value)) {
    return "その他";
  }
  return legacyCategories[value] ?? "その他";
}

export const categoryHues = {
  食費: "orange",
  日用品: "cyan",
  衣服: "magenta",
  趣味: "purple",
  交通: "blue",
  交際: "yellow",
  医療: "red",
  住居: "green",
  光熱費: "green",
  通信: "green",
  税金: "gray",
  貯蓄: "gray",
  その他: "gray",
} satisfies Record<Category, string>;

export type ChipHue = (typeof categoryHues)[Category];

export function categoryColor(category: Category) {
  return `var(--category-${categoryHues[category]})`;
}
