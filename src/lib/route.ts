import { type Category, isCategory } from "@/lib/category";
import { toYearMonth, type YearMonth } from "@/lib/date";

export type ReceiptFilter = {
  month?: YearMonth;
  all?: boolean;
  date?: string;
  category?: Category;
};

function splitHash(hash: string) {
  const [path = "", search = ""] = hash.split("?");
  return { path, search };
}

export function hashPath(hash: string) {
  return splitHash(hash).path;
}

export function receiptsHash({ month, all, date, category }: ReceiptFilter) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (all) params.set("all", "1");
  if (date) params.set("date", date);
  if (category) params.set("category", category);
  const search = params.toString();
  return search ? `#/receipts?${search}` : "#/receipts";
}

export function parseReceiptFilter(hash: string): ReceiptFilter {
  const params = new URLSearchParams(splitHash(hash).search);
  const month = params.get("month");
  const date = params.get("date");
  const category = params.get("category");
  return {
    month:
      month && /^\d{4}-\d{2}$/.test(month) ? toYearMonth(month) : undefined,
    all: params.get("all") === "1",
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    category: isCategory(category) ? category : undefined,
  };
}
