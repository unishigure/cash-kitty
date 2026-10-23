import { describe, expect, test } from "bun:test";
import {
	INITIAL_FILTERS,
	initialStats,
	type StatsState,
	statsReducer,
} from "./statsFilters";

const onDay: StatsState = {
	...initialStats("2026-10"),
	filters: { ...INITIAL_FILTERS, text: "イオン", day: "2026-10-11" },
};

describe("statsReducer", () => {
	test("keeps a chosen day while the month and period stay", () => {
		const next = statsReducer(initialStats("2026-10"), {
			type: "setFilters",
			filters: { ...INITIAL_FILTERS, day: "2026-10-11" },
		});
		expect(next.filters.day).toBe("2026-10-11");
		const typed = statsReducer(next, {
			type: "setFilters",
			filters: { ...next.filters, text: "イオン" },
		});
		expect(typed.filters.day).toBe("2026-10-11");
	});

	test("changing the month clears the day and keeps the other filters", () => {
		for (const next of [
			statsReducer(onDay, { type: "shiftMonth", delta: -1 }),
			statsReducer(onDay, { type: "selectMonth", month: "2026-03" }),
		]) {
			expect(next.month).not.toBe("2026-10");
			expect(next.filters.day).toBeNull();
			expect(next.filters.text).toBe("イオン");
		}
	});

	test("month changes slide in the direction of travel", () => {
		expect(statsReducer(onDay, { type: "shiftMonth", delta: 1 })).toMatchObject(
			{ month: "2026-11", direction: 1 },
		);
		expect(
			statsReducer(onDay, { type: "selectMonth", month: "2025-12" }),
		).toMatchObject({ month: "2025-12", direction: -1 });
	});

	test("selecting the current month changes nothing", () => {
		expect(statsReducer(onDay, { type: "selectMonth", month: "2026-10" })).toBe(
			onDay,
		);
	});

	test("leaving the month period clears the day", () => {
		for (const period of [
			{ kind: "all" },
			{ kind: "range", from: "2026-10-01", to: "2026-10-31" },
		] as const) {
			const next = statsReducer(onDay, {
				type: "setFilters",
				filters: { ...onDay.filters, period },
			});
			expect(next.filters.day).toBeNull();
			expect(next.filters.period).toEqual(period);
		}
	});
});
