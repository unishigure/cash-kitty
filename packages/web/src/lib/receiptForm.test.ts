import { describe, expect, test } from "bun:test";
import {
	EMPTY_RECEIPT_FORM,
	parseReceiptForm,
	type ReceiptFormState,
	receiptToForm,
} from "./receiptForm";
import type { Receipt } from "./types";

const filled: ReceiptFormState = {
	storeName: "  スーパー  ",
	totalAmount: " 1234.6 ",
	date: "2026-06-01",
	category: "食費",
	memo: "  ",
};

describe("parseReceiptForm", () => {
	test("returns trimmed fields with a rounded amount and no blank memo", () => {
		expect(parseReceiptForm(filled)).toEqual({
			ok: true,
			value: {
				storeName: "スーパー",
				totalAmount: 1235,
				date: "2026-06-01",
				category: "食費",
				memo: undefined,
			},
		});
	});

	test("keeps a memo and allows an empty store name", () => {
		const result = parseReceiptForm({ ...filled, storeName: "", memo: "x" });
		expect(result.ok && result.value.memo).toBe("x");
		expect(result.ok && result.value.storeName).toBe("");
	});

	test.each([
		["empty form", EMPTY_RECEIPT_FORM],
		["missing amount", { ...filled, totalAmount: "" }],
		["negative amount", { ...filled, totalAmount: "-1" }],
		["non-numeric amount", { ...filled, totalAmount: "abc" }],
		["missing date", { ...filled, date: "" }],
		["malformed date", { ...filled, date: "2026/06/01" }],
		["missing category", { ...filled, category: "" }],
	])("rejects %s", (_name, form) => {
		const result = parseReceiptForm(form);
		expect(result.ok).toBe(false);
		expect(!result.ok && result.error.length > 0).toBe(true);
	});

	test("round-trips a stored receipt through the form", () => {
		const receipt: Receipt = {
			id: "r1",
			storeName: "店",
			totalAmount: 500,
			date: "2026-01-02",
			category: "交通",
			memo: "メモ",
			createdAt: "",
			updatedAt: "",
		};
		expect(parseReceiptForm(receiptToForm(receipt))).toEqual({
			ok: true,
			value: {
				storeName: "店",
				totalAmount: 500,
				date: "2026-01-02",
				category: "交通",
				memo: "メモ",
			},
		});
	});
});
