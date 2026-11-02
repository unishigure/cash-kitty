import { toYearMonth, type YearMonth } from "@/lib/date";

export type ReceiptFilter = {
  month?: YearMonth;
  all?: boolean;
  date?: string;
  category?: string;
};

export function hashPath(hash: string) {
  return hash.split("?")[0] ?? "";
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
  const params = new URLSearchParams(hash.split("?")[1] ?? "");
  const month = params.get("month");
  const date = params.get("date");
  return {
    month:
      month && /^\d{4}-\d{2}$/.test(month) ? toYearMonth(month) : undefined,
    all: params.get("all") === "1",
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    category: params.get("category") ?? undefined,
  };
}
