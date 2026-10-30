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
