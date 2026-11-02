export type YearMonth = `${number}-${number}`;

export const weekdays = ["日", "月", "火", "水", "木", "金", "土"] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDate(date: string) {
  return new Date(`${date}T00:00`);
}

export function today() {
  return toISODate(new Date());
}

export function toYearMonth(date: string) {
  return date.slice(0, 7) as YearMonth;
}

export function shiftMonth(month: YearMonth, delta: number) {
  const date = parseDate(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  return toYearMonth(toISODate(date));
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

export function formatShortMonth(month: YearMonth) {
  return `${Number(month.slice(5))}月`;
}

export function addDays(date: string, days: number) {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatFullDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = weekdays[parseDate(date).getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return `${toISODate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function daysBetween(from: string, to: string) {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000);
}
