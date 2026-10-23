import { describe, expect, test } from "bun:test";
import {
	categoryTotals,
	changeRatio,
	dailyTotals,
	monthComparison,
	monthlyTotals,
	withoutCategories,
} from "./analytics";
import type { Receipt } from "./types";

function receipt(
	date: string,
	totalAmount: number,
	category = "食費",
	storeName = "店",
): Receipt {
	return {
		id: `${date}-${totalAmount}-${storeName}`,
		storeName,
		totalAmount,
		date,
		category,
		createdAt: "",
		updatedAt: "",
	};
}

const receipts = [
	receipt("2025-06-10", 1000, "食費", "イオン"),
	receipt("2026-05-02", 200, "外食", "ｽﾀｰﾊﾞｯｸｽ"),
	receipt("2026-06-01", 300, "食費", "イオン"),
	receipt("2026-06-01", 700, "外食", "スターバックス"),
	receipt("2026-06-30", 2000, "日用品", " イオン "),
];

describe("categoryTotals", () => {
	test("sums and counts per category, largest first", () => {
		expect(categoryTotals(receipts.slice(2))).toEqual([
			{ category: "日用品", amount: 2000, count: 1 },
			{ category: "外食", amount: 700, count: 1 },
			{ category: "食費", amount: 300, count: 1 },
		]);
	});
});

describe("monthlyTotals", () => {
	test("covers consecutive months oldest first, with empty months as zero", () => {
		const months = monthlyTotals(receipts, "2026-07", 3);
		expect(months.map((m) => [m.month, m.total, m.count])).toEqual([
			["2026-05", 200, 1],
			["2026-06", 3000, 3],
			["2026-07", 0, 0],
		]);
		expect(months[1]?.byCategory).toEqual({
			食費: 300,
			外食: 700,
			日用品: 2000,
		});
	});

	test("crosses a year boundary", () => {
		expect(monthlyTotals([], "2026-01", 2).map((m) => m.month)).toEqual([
			"2025-12",
			"2026-01",
		]);
	});
});

describe("monthComparison", () => {
	test("compares a month with the previous month and the same month last year", () => {
		const c = monthComparison(receipts, "2026-06");
		expect([c.current.total, c.previous.total, c.lastYear.total]).toEqual([
			3000, 200, 1000,
		]);
		expect(changeRatio(c.current.total, c.lastYear.total)).toBe(2);
		expect(changeRatio(100, 0)).toBeNull();
	});
});

describe("withoutCategories", () => {
	test("leaves the excluded categories out of every aggregate", () => {
		const input = withoutCategories(receipts, ["外食", "日用品"]);
		expect(monthComparison(input, "2026-06").current.total).toBe(300);
		expect(monthComparison(input, "2026-06").previous.total).toBe(0);
		expect(categoryTotals(input).map((t) => t.category)).toEqual(["食費"]);
		expect(monthlyTotals(input, "2026-06", 2).map((m) => m.total)).toEqual([
			0, 300,
		]);
		expect(dailyTotals(input, "2026-06")[0]).toEqual({
			date: "2026-06-01",
			total: 300,
			count: 1,
		});
	});

	test("returns the input unchanged when nothing is excluded", () => {
		expect(withoutCategories(receipts, [])).toBe(receipts);
	});
});

describe("dailyTotals", () => {
	test("returns every day of the month with that day's spend", () => {
		const days = dailyTotals(receipts, "2026-06");
		expect(days).toHaveLength(30);
		expect(days[0]).toEqual({ date: "2026-06-01", total: 1000, count: 2 });
		expect(days[29]).toEqual({ date: "2026-06-30", total: 2000, count: 1 });
		expect(days[14]).toEqual({ date: "2026-06-15", total: 0, count: 0 });
		expect(dailyTotals([], "2024-02")).toHaveLength(29);
	});
});
