import { useSyncExternalStore } from "react";
import { type Category, categories, type Receipt } from "@/lib/receipt";

const fixedCategoriesKey = "cash-kitty-v2.fixed-categories";
const excludeFixedKey = "cash-kitty-v2.exclude-fixed";

const defaultFixedCategories: readonly Category[] = [
  "住居",
  "光熱費",
  "通信",
  "税金",
  "貯蓄",
];

function loadFixedCategories(): readonly Category[] {
  const stored = localStorage.getItem(fixedCategoriesKey);
  if (stored === null) return defaultFixedCategories;
  const names = stored.split(",");
  return categories.filter((category) => names.includes(category));
}

type FixedCosts = {
  categories: readonly Category[];
  exclude: boolean;
};

let state: FixedCosts = {
  categories: loadFixedCategories(),
  exclude: localStorage.getItem(excludeFixedKey) === "true",
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: Partial<FixedCosts>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function useFixedCosts() {
  return useSyncExternalStore(subscribe, () => state);
}

export function setFixedCategories(next: readonly Category[]) {
  const ordered = categories.filter((category) => next.includes(category));
  localStorage.setItem(fixedCategoriesKey, ordered.join(","));
  update({ categories: ordered });
}

export function setExcludeFixed(exclude: boolean) {
  if (exclude) localStorage.setItem(excludeFixedKey, "true");
  else localStorage.removeItem(excludeFixedKey);
  update({ exclude });
}

export function excludeFixedCosts(
  receipts: Receipt[],
  { categories, exclude }: FixedCosts,
) {
  return exclude
    ? receipts.filter((receipt) => !categories.includes(receipt.category))
    : receipts;
}
