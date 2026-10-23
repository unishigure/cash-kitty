import { monthKey, shiftMonth } from "./format";
import type { Receipt } from "./types";

export interface CategoryTotal {
	category: string;
	amount: number;
	count: number;
}

export interface MonthTotal {
	month: string;
	total: number;
	count: number;
	byCategory: Record<string, number>;
}

export interface DayTotal {
	date: string;
	total: number;
	count: number;
}

export function withoutCategories(
	receipts: readonly Receipt[],
	categories: readonly string[],
): readonly Receipt[] {
	if (!categories.length) return receipts;
	const skip = new Set(categories);
	return receipts.filter((r) => !skip.has(r.category));
}

const sum = (receipts: readonly Receipt[]) =>
	receipts.reduce((s, r) => s + r.totalAmount, 0);

/** Largest amount first. */
export function categoryTotals(receipts: readonly Receipt[]): CategoryTotal[] {
	const map = new Map<string, CategoryTotal>();
	for (const r of receipts) {
		const t = map.get(r.category) ?? {
			category: r.category,
			amount: 0,
			count: 0,
		};
		t.amount += r.totalAmount;
		t.count++;
		map.set(r.category, t);
	}
	return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function monthTotal(receipts: readonly Receipt[], month: string): MonthTotal {
	const inMonth = receipts.filter((r) => monthKey(r.date) === month);
	const byCategory: Record<string, number> = {};
	for (const r of inMonth) {
		byCategory[r.category] = (byCategory[r.category] ?? 0) + r.totalAmount;
	}
	return { month, total: sum(inMonth), count: inMonth.length, byCategory };
}

/** `count` consecutive months ending at `endMonth`, oldest first. */
export function monthlyTotals(
	receipts: readonly Receipt[],
	endMonth: string,
	count: number,
): MonthTotal[] {
	return Array.from({ length: count }, (_, i) =>
		monthTotal(receipts, shiftMonth(endMonth, i - count + 1)),
	);
}

export function monthComparison(
	receipts: readonly Receipt[],
	month: string,
): { current: MonthTotal; previous: MonthTotal; lastYear: MonthTotal } {
	return {
		current: monthTotal(receipts, month),
		previous: monthTotal(receipts, shiftMonth(month, -1)),
		lastYear: monthTotal(receipts, shiftMonth(month, -12)),
	};
}

/** Relative change from `base` to `value`, or null when there is no base. */
export function changeRatio(value: number, base: number): number | null {
	return base > 0 ? (value - base) / base : null;
}

/** One entry per calendar day of `month`, including days with no receipts. */
export function dailyTotals(
	receipts: readonly Receipt[],
	month: string,
): DayTotal[] {
	const [y = 0, m = 1] = month.split("-").map(Number);
	const days = new Date(y, m, 0).getDate();
	const out: DayTotal[] = Array.from({ length: days }, (_, i) => ({
		date: `${month}-${String(i + 1).padStart(2, "0")}`,
		total: 0,
		count: 0,
	}));
	for (const r of receipts) {
		if (monthKey(r.date) !== month) continue;
		const day = out[Number(r.date.slice(8, 10)) - 1];
		if (!day) continue;
		day.total += r.totalAmount;
		day.count++;
	}
	return out;
}
