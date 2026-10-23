import { monthKey } from "./format";
import type { Receipt } from "./types";

export type Period =
	| { kind: "month"; month: string }
	| { kind: "all" }
	/** Inclusive ISO dates; an empty bound leaves that side open. */
	| { kind: "range"; from: string; to: string };

export type SortKey = "date-asc" | "date-desc" | "amount-desc" | "amount-asc";

export interface ReceiptQuery {
	text: string;
	period: Period;
	/** Empty means every category. */
	categories: ReadonlySet<string>;
	minAmount?: number;
	maxAmount?: number;
	sort: SortKey;
}

type Compare = (a: Receipt, b: Receipt) => number;

const byDateAsc: Compare = (a, b) =>
	a.date.localeCompare(b.date) ||
	a.createdAt.localeCompare(b.createdAt) ||
	a.id.localeCompare(b.id);

export const SORTS: Record<SortKey, { label: string; compare: Compare }> = {
	"date-asc": { label: "日付（古い順）", compare: byDateAsc },
	"date-desc": {
		label: "日付（新しい順）",
		compare: (a, b) => byDateAsc(b, a),
	},
	"amount-desc": {
		label: "金額（高い順）",
		compare: (a, b) => b.totalAmount - a.totalAmount || byDateAsc(b, a),
	},
	"amount-asc": {
		label: "金額（低い順）",
		compare: (a, b) => a.totalAmount - b.totalAmount || byDateAsc(b, a),
	},
};

export const DEFAULT_SORT: SortKey = "date-asc";

/** Folds case and full-width/half-width forms so "ＡＢＣ", "abc" and "ｱｲ"/"アイ" match. */
export function normalizeText(text: string): string {
	return text.normalize("NFKC").toLowerCase();
}

export function inPeriod(receipt: Receipt, period: Period): boolean {
	switch (period.kind) {
		case "month":
			return monthKey(receipt.date) === period.month;
		case "all":
			return true;
		case "range":
			return (
				(!period.from || receipt.date >= period.from) &&
				(!period.to || receipt.date <= period.to)
			);
	}
}

export function filterReceipts(
	receipts: readonly Receipt[],
	query: ReceiptQuery,
): Receipt[] {
	const terms = normalizeText(query.text).split(/\s+/).filter(Boolean);
	return receipts
		.filter((r) => {
			if (!inPeriod(r, query.period)) return false;
			if (query.categories.size && !query.categories.has(r.category)) {
				return false;
			}
			if (query.minAmount !== undefined && r.totalAmount < query.minAmount) {
				return false;
			}
			if (query.maxAmount !== undefined && r.totalAmount > query.maxAmount) {
				return false;
			}
			if (!terms.length) return true;
			const haystack = normalizeText(
				[r.storeName, r.memo ?? "", r.fullText ?? ""].join("\n"),
			);
			return terms.every((t) => haystack.includes(t));
		})
		.sort(SORTS[query.sort].compare);
}
