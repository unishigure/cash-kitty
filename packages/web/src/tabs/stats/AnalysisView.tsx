import { useMemo } from "react";
import { MonthSelector } from "../../components/MonthSelector";
import type { SyncState } from "../../hooks/useGoogleDrive";
import {
	categoryTotals,
	changeRatio,
	dailyTotals,
	monthComparison,
	monthlyTotals,
} from "../../lib/analytics";
import { categoryColor } from "../../lib/categories";
import {
	currentMonthKey,
	formatYen,
	monthKey,
	shiftMonth,
} from "../../lib/format";
import type { Receipt } from "../../lib/types";
import { DailyHeatmap } from "./DailyHeatmap";
import { TrendChart } from "./TrendChart";

// Keep the window on the latest 12 months while the selected month is inside
// it, so tapping a column highlights it instead of scrolling the chart.
function trendEnd(month: string): string {
	const current = currentMonthKey();
	return month <= current && month > shiftMonth(current, -12) ? current : month;
}

function Change({
	label,
	value,
	base,
}: {
	label: string;
	value: number;
	base: number;
}) {
	const ratio = changeRatio(value, base);
	return (
		<div className="flex-1 rounded-xl bg-emerald-700/40 px-3 py-2">
			<p className="text-[11px] text-emerald-100">{label}</p>
			<p className="text-sm font-bold">
				{ratio === null
					? "—"
					: `${ratio >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(ratio * 100))}%`}
			</p>
			<p className="text-[11px] text-emerald-100">{formatYen(base)}</p>
		</div>
	);
}

function Card({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
			<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
				{title}
			</h2>
			{children}
		</section>
	);
}

export function AnalysisView({
	receipts,
	month,
	direction,
	onChangeMonth,
	onSelectMonth,
	onSelectCategory,
	onShowDay,
	syncState,
}: {
	receipts: readonly Receipt[];
	month: string;
	direction: 1 | -1;
	onChangeMonth: (delta: 1 | -1) => void;
	onSelectMonth: (month: string) => void;
	onSelectCategory: (category: string) => void;
	onShowDay: (date: string) => void;
	syncState: SyncState;
}) {
	const comparison = useMemo(
		() => monthComparison(receipts, month),
		[receipts, month],
	);
	const byCategory = useMemo(
		() => categoryTotals(receipts.filter((r) => monthKey(r.date) === month)),
		[receipts, month],
	);
	const trend = useMemo(
		() => monthlyTotals(receipts, trendEnd(month), 12),
		[receipts, month],
	);
	const days = useMemo(() => dailyTotals(receipts, month), [receipts, month]);
	const { current } = comparison;

	return (
		<div className="space-y-3">
			<MonthSelector month={month} onChangeMonth={onChangeMonth} />
			<div
				key={month}
				className={`space-y-4 ${direction === 1 ? "slide-from-right" : "slide-from-left"}`}
			>
				<div className="relative space-y-3 rounded-2xl bg-emerald-600 p-5 text-white">
					<div>
						<p className="text-xs font-medium text-emerald-100">この月の合計</p>
						<p className="mt-1 text-3xl font-bold">
							{formatYen(current.total)}
						</p>
						<p className="mt-1 text-xs text-emerald-100">
							{current.count} 件のレシート
						</p>
					</div>
					<div className="flex gap-2">
						<Change
							label="前月比"
							value={current.total}
							base={comparison.previous.total}
						/>
						<Change
							label="前年同月比"
							value={current.total}
							base={comparison.lastYear.total}
						/>
					</div>
					{syncState.kind === "syncing" && (
						<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-600/60">
							<span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
						</div>
					)}
				</div>

				{syncState.kind === "error" && (
					<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
						{syncState.message}
					</p>
				)}

				<Card title="カテゴリ別">
					{byCategory.length === 0 ? (
						<p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
							この月のレシートはありません
						</p>
					) : (
						<div className="space-y-2.5">
							{byCategory.map(({ category, amount }) => {
								const pct =
									current.total > 0 ? (amount / current.total) * 100 : 0;
								return (
									<button
										key={category}
										type="button"
										onClick={() => onSelectCategory(category)}
										className="block w-full rounded-lg px-2 py-1.5 text-left transition-colors active:bg-slate-100 dark:active:bg-slate-700"
									>
										<div className="mb-1 flex justify-between text-xs">
											<span className="font-medium text-slate-600 dark:text-slate-300">
												{category}
											</span>
											<span className="tabular-nums text-slate-500 dark:text-slate-400">
												{formatYen(amount)}（{pct.toFixed(0)}%）
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
											<div
												className="h-full rounded-full"
												style={{
													width: `${pct}%`,
													backgroundColor: categoryColor(category),
												}}
											/>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</Card>

				<Card title="12か月の推移">
					<TrendChart
						months={trend}
						selected={month}
						onSelect={onSelectMonth}
					/>
				</Card>

				<Card title="日別">
					<DailyHeatmap days={days} onShowDay={onShowDay} />
				</Card>
			</div>
		</div>
	);
}
