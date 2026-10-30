export type YearMonth = `${number}-${number}`;

export function toYearMonth(date: string) {
  return date.slice(0, 7) as YearMonth;
}

export function shiftMonth(month: YearMonth, delta: number) {
  const date = new Date(`${month}-01T00:00`);
  date.setMonth(date.getMonth() + delta);
  return toYearMonth(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
  );
}

export function isDateInMonth(date: string, month: YearMonth) {
  return date.startsWith(`${month}-`);
}

export function daysInMonth(month: YearMonth) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year ?? 0, monthIndex ?? 0, 0).getDate();
}

export function formatMonth(month: YearMonth) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}年${monthNumber}月`;
}
