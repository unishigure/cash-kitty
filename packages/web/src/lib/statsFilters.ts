import {
	DEFAULT_SORT,
	type Period,
	type ReceiptQuery,
	type SortKey,
} from "./receiptQuery";

export type StatsView = "list" | "analysis";

/**
 * The 明細 filters as the user set them. A month period carries no month of
 * its own: it follows the stats month that the arrows, swipe and analysis
 * view share, so there is one month to keep in sync instead of two.
 */
export type PeriodChoice =
	| { kind: "month" }
	| Exclude<Period, { kind: "month" }>;

export const PERIOD_TOTAL_LABEL: Record<Period["kind"], string> = {
	month: "この月の合計",
	all: "全期間の合計",
	range: "期間の合計",
};

export interface ListFilters {
	text: string;
	period: PeriodChoice;
	categories: ReadonlySet<string>;
	minAmount?: number;
	maxAmount?: number;
	sort: SortKey;
}

export const INITIAL_FILTERS: ListFilters = {
	text: "",
	period: { kind: "month" },
	categories: new Set(),
	sort: DEFAULT_SORT,
};

export function toQuery(filters: ListFilters, month: string): ReceiptQuery {
	return {
		...filters,
		period:
			filters.period.kind === "month"
				? { kind: "month", month }
				: filters.period,
	};
}

/** Filters hidden inside the collapsible panel that are not at their default. */
export function hiddenFilterCount(filters: ListFilters): number {
	return [
		filters.categories.size > 0,
		filters.minAmount !== undefined || filters.maxAmount !== undefined,
		filters.sort !== DEFAULT_SORT,
	].filter(Boolean).length;
}
