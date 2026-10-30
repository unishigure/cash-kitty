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

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatFullDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = "日月火水木金土"[new Date(`${date}T00:00`).getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

export function daysBetween(from: string, to: string) {
  const ms =
    new Date(`${to}T00:00`).getTime() - new Date(`${from}T00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatShortDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = "日月火水木金土"[new Date(`${date}T00:00`).getDay()];
  return `${month}/${day}（${weekday}）`;
}
