import { daysInMonth, isDateInMonth, type YearMonth } from "./month";
import type { Receipt } from "./receipt";

export function totalOfMonth(
  receipts: Receipt[],
  month: YearMonth,
  uptoDay = daysInMonth(month),
) {
  return receipts
    .filter(
      (r) =>
        isDateInMonth(r.date, month) && Number(r.date.slice(8, 10)) <= uptoDay,
    )
    .reduce((sum, r) => sum + r.totalAmount, 0);
}

export function dailyTotals(receipts: Receipt[]) {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    totals.set(
      receipt.date,
      (totals.get(receipt.date) ?? 0) + receipt.totalAmount,
    );
  }
  return totals;
}

export function quartiles(values: number[]) {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const at = (ratio: number) =>
    sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0;
  return [at(0.25), at(0.5), at(0.75)] as const;
}

export function categoryTotals(receipts: Receipt[], month: YearMonth) {
  const totals = new Map<string, { total: number; count: number }>();
  for (const receipt of receipts) {
    if (!isDateInMonth(receipt.date, month)) continue;
    const current = totals.get(receipt.category) ?? { total: 0, count: 0 };
    totals.set(receipt.category, {
      total: current.total + receipt.totalAmount,
      count: current.count + 1,
    });
  }
  return [...totals]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.total - a.total);
}
