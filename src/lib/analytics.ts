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

export function cumulativeByDay(
  receipts: Receipt[],
  month: YearMonth,
  uptoDay = daysInMonth(month),
) {
  const daily = Array.from({ length: uptoDay }, () => 0);
  for (const receipt of receipts) {
    if (!isDateInMonth(receipt.date, month)) continue;
    const index = Number(receipt.date.slice(8, 10)) - 1;
    if (index < uptoDay)
      daily[index] = (daily[index] ?? 0) + receipt.totalAmount;
  }
  let sum = 0;
  return daily.map((amount) => (sum += amount));
}
