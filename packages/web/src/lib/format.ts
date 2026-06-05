/** Format an integer amount as JPY, e.g. 4251 -> "¥4,251". */
export function formatYen(amount: number): string {
  return "¥" + Math.round(amount).toLocaleString("ja-JP");
}

/** Today as an ISO `YYYY-MM-DD` string in local time. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** A `Date` -> local `YYYY-MM-DD`. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A `YYYY-MM-DD` date -> its `YYYY-MM` month key. */
export function monthKey(isoDate: string | undefined | null): string {
  return (isoDate ?? "").slice(0, 7);
}

/** "2026-06" -> "2026年6月". */
export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
}

/** Shift a `YYYY-MM` key by `delta` months. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y!, m! - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Current `YYYY-MM`. */
export function currentMonthKey(): string {
  return monthKey(todayIso());
}
