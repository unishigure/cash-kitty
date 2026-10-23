import type { Receipt } from "./types";

export interface ReceiptFormState {
	storeName: string;
	totalAmount: string;
	date: string;
	category: string;
	memo: string;
}

export type ReceiptFields = Pick<
	Receipt,
	"storeName" | "totalAmount" | "date" | "category" | "memo"
>;

export type ParsedReceiptForm =
	| { ok: true; value: ReceiptFields }
	| { ok: false; error: string };

export const EMPTY_RECEIPT_FORM: ReceiptFormState = {
	storeName: "",
	totalAmount: "",
	date: "",
	category: "",
	memo: "",
};

export function receiptToForm(r: Receipt): ReceiptFormState {
	return {
		storeName: r.storeName,
		totalAmount: String(r.totalAmount),
		date: r.date,
		category: r.category,
		memo: r.memo ?? "",
	};
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseReceiptForm(form: ReceiptFormState): ParsedReceiptForm {
	const amountText = form.totalAmount.trim();
	if (!amountText) return { ok: false, error: "金額を入力してください。" };
	const amount = Number(amountText);
	if (!Number.isFinite(amount) || amount < 0) {
		return { ok: false, error: "金額が正しくありません。" };
	}
	if (!form.date) return { ok: false, error: "日付を入力してください。" };
	if (!ISO_DATE.test(form.date)) {
		return { ok: false, error: "日付が正しくありません。" };
	}
	if (!form.category) {
		return { ok: false, error: "カテゴリを選択してください。" };
	}
	return {
		ok: true,
		value: {
			storeName: form.storeName.trim(),
			totalAmount: Math.round(amount),
			date: form.date,
			category: form.category,
			memo: form.memo.trim() || undefined,
		},
	};
}
