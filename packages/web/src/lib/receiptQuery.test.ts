import { describe, expect, test } from "bun:test";
import { filterReceipts, type ReceiptQuery } from "./receiptQuery";
import type { Receipt } from "./types";

function receipt(
	id: string,
	date: string,
	totalAmount: number,
	extra: Partial<Receipt> = {},
): Receipt {
	return {
		id,
		storeName: `店${id}`,
		totalAmount,
		date,
		category: "食費",
		createdAt: `${date}T00:00:00Z`,
		updatedAt: `${date}T00:00:00Z`,
		...extra,
	};
}

const receipts: Receipt[] = [
	receipt("a", "2026-05-31", 500, { storeName: "ｾﾌﾞﾝイレブン" }),
	receipt("b", "2026-06-01", 1200, { memo: "Coffee beans", category: "外食" }),
	receipt("c", "2026-06-15", 300, { fullText: "ＡＢＣマート\n合計 300" }),
	receipt("d", "2026-06-30", 8000, { category: "日用品" }),
	receipt("e", "2026-07-01", 50, { category: "外食" }),
];

const base: ReceiptQuery = {
	text: "",
	period: { kind: "all" },
	categories: new Set(),
	day: null,
	sort: "date-asc",
};
const ids = (q: Partial<ReceiptQuery>) =>
	filterReceipts(receipts, { ...base, ...q }).map((r) => r.id);

describe("filterReceipts", () => {
	test("month period keeps only that month, oldest first by default", () => {
		expect(ids({ period: { kind: "month", month: "2026-06" } })).toEqual([
			"b",
			"c",
			"d",
		]);
	});

	test("range period is inclusive and open-ended on an empty bound", () => {
		expect(
			ids({ period: { kind: "range", from: "2026-06-01", to: "2026-06-30" } }),
		).toEqual(["b", "c", "d"]);
		expect(
			ids({ period: { kind: "range", from: "2026-06-30", to: "" } }),
		).toEqual(["d", "e"]);
	});

	test("day narrows the period to that date and combines with other filters", () => {
		const june = { kind: "month", month: "2026-06" } as const;
		expect(ids({ period: june, day: "2026-06-15" })).toEqual(["c"]);
		expect(ids({ period: june, day: "2026-06-02" })).toEqual([]);
		expect(
			ids({ period: june, day: "2026-06-01", categories: new Set(["食費"]) }),
		).toEqual([]);
	});

	test("text matches store name, memo and full text across width and case", () => {
		expect(ids({ text: "セブン" })).toEqual(["a"]);
		expect(ids({ text: "coffee" })).toEqual(["b"]);
		expect(ids({ text: "abcマート" })).toEqual(["c"]);
		expect(ids({ text: "店b beans" })).toEqual(["b"]);
		expect(ids({ text: "店b nothing" })).toEqual([]);
	});

	test("categories select any of several", () => {
		expect(ids({ categories: new Set(["外食", "日用品"]) })).toEqual([
			"b",
			"d",
			"e",
		]);
	});

	test("amount bounds are inclusive", () => {
		expect(ids({ minAmount: 300, maxAmount: 1200 })).toEqual(["a", "b", "c"]);
	});

	test("sorts by date or amount in either direction", () => {
		expect(ids({ sort: "date-desc" })).toEqual(["e", "d", "c", "b", "a"]);
		expect(ids({ sort: "amount-desc" })).toEqual(["d", "b", "a", "c", "e"]);
		expect(ids({ sort: "amount-asc" })).toEqual(["e", "c", "a", "b", "d"]);
	});
});
