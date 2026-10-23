import { formatMonthLabel } from "../lib/format";

export function MonthSelector({
	month,
	onChangeMonth,
}: {
	month: string;
	onChangeMonth: (delta: 1 | -1) => void;
}) {
	return (
		<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
			<button
				type="button"
				onClick={() => onChangeMonth(-1)}
				className="rounded-lg px-3 py-1.5 text-lg text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-700"
				aria-label="前の月"
			>
				‹
			</button>
			<span className="text-base font-bold">{formatMonthLabel(month)}</span>
			<button
				type="button"
				onClick={() => onChangeMonth(1)}
				className="rounded-lg px-3 py-1.5 text-lg text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-700"
				aria-label="次の月"
			>
				›
			</button>
		</div>
	);
}
