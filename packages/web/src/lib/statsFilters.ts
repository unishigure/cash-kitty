import { shiftMonth } from "./format";
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
	/** A day of the stats month. Only kept while the period is a month. */
	day: string | null;
	categories: ReadonlySet<string>;
	minAmount?: number;
	maxAmount?: number;
	sort: SortKey;
}

export const INITIAL_FILTERS: ListFilters = {
	text: "",
	period: { kind: "month" },
	day: null,
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

/** The stats month and the 明細 filters, which change together. */
export interface StatsState {
	month: string;
	/** Which way the last month change travelled, for the slide animation. */
	direction: 1 | -1;
	filters: ListFilters;
}

export type StatsAction =
	| { type: "shiftMonth"; delta: 1 | -1 }
	| { type: "selectMonth"; month: string }
	| { type: "setFilters"; filters: ListFilters };

export function initialStats(month: string): StatsState {
	return { month, direction: 1, filters: INITIAL_FILTERS };
}

/**
 * Every month and period change goes through here, so a selected day never
 * outlives the month it belongs to.
 */
export function statsReducer(
	state: StatsState,
	action: StatsAction,
): StatsState {
	switch (action.type) {
		case "shiftMonth":
			return moveTo(state, shiftMonth(state.month, action.delta), action.delta);
		case "selectMonth":
			if (action.month === state.month) return state;
			// Keys are "YYYY-MM", so they compare in time order.
			return moveTo(state, action.month, state.month < action.month ? 1 : -1);
		case "setFilters": {
			const { filters } = action;
			return {
				...state,
				filters:
					filters.period.kind === "month" ? filters : { ...filters, day: null },
			};
		}
	}
}

function moveTo(
	state: StatsState,
	month: string,
	direction: 1 | -1,
): StatsState {
	return { month, direction, filters: { ...state.filters, day: null } };
}
