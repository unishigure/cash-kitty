import { useId, useMemo } from "react";
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
import { inPeriod, type Period } from "../../lib/receiptQuery";
import { PERIOD_TOTAL_LABEL } from "../../lib/statsFilters";
import type { Receipt } from "../../lib/types";
import { DailyHeatmap } from "./DailyHeatmap";
import { TrendChart } from "./TrendChart";

// Keep the window on the latest 12 months while the period ends inside it, so
// tapping a column highlights it instead of scrolling the chart.
function trendEnd(period: Period): string {
	const current = currentMonthKey();
	const end =
		period.kind === "month"
			? period.month
			: period.kind === "range" && period.to
				? monthKey(period.to)
				: current;
	return end <= current && end > shiftMonth(current, -12) ? current : end;
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
	className = "",
	children,
}: {
	title: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<section
			className={`space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
				{title}
			</h2>
			{children}
		</section>
	);
}

function FixedCostToggle({
	fixedCategories,
	on,
	onChange,
}: {
	fixedCategories: readonly string[];
	on: boolean;
	onChange: (on: boolean) => void;
}) {
	const available = fixedCategories.length > 0;
	const names = fixedCategories.join("・");
	const hintId = useId();
	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			aria-label="固定費を除く"
			aria-describedby={hintId}
			disabled={!available}
			onClick={() => onChange(!on)}
			className="flex w-full items-center gap-2 border-t border-white/20 pt-3 text-left text-xs text-emerald-50 disabled:opacity-60"
		>
			<span className="shrink-0 font-medium">固定費を除く</span>
			<span
				id={hintId}
				title={available ? names : undefined}
				className="min-w-0 flex-1 truncate text-[11px] text-emerald-100/80"
			>
				{available ? names : "設定タブで固定費のカテゴリを選ぶと使えます"}
			</span>
			<span
				className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
					on ? "bg-white" : "bg-emerald-800/50"
				}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full shadow transition ${
						on ? "translate-x-3 bg-emerald-600" : "bg-white"
					}`}
				/>
			</span>
		</button>
	);
}

const NO_CATEGORIES: ReadonlySet<string> = new Set();

export function AnalysisView({
	receipts,
	fixedCategories,
	excludeFixed,
	onChangeExcludeFixed,
	period,
	month,
	direction,
	onChangeMonth,
	onSelectMonth,
	activeCategories = NO_CATEGORIES,
	onSelectCategory,
	selectedDay,
	onSelectDay,
	syncState,
}: {
	/** Already without fixed costs when `excludeFixed` is on. */
	receipts: readonly Receipt[];
	fixedCategories: readonly string[];
	excludeFixed: boolean;
	onChangeExcludeFixed: (exclude: boolean) => void;
	/** What every card aggregates. Only a month gets comparisons and the heatmap. */
	period: Period;
	/** The stats month, for the month selector shown below `lg`. */
	month: string;
	direction: 1 | -1;
	onChangeMonth: (delta: 1 | -1) => void;
	onSelectMonth: (month: string) => void;
	/** Categories the list is narrowed to; the others are dimmed. */
	activeCategories?: ReadonlySet<string>;
	onSelectCategory: (category: string) => void;
	/** The day the list is narrowed to, highlighted in the heatmap. */
	selectedDay: string | null;
	onSelectDay: (date: string) => void;
	syncState: SyncState;
}) {
	const selectedMonth = period.kind === "month" ? period.month : undefined;
	const inRange = useMemo(
		() => receipts.filter((r) => inPeriod(r, period)),
		[receipts, period],
	);
	const total = inRange.reduce((s, r) => s + r.totalAmount, 0);
	const comparison = useMemo(
		() => selectedMonth && monthComparison(receipts, selectedMonth),
		[receipts, selectedMonth],
	);
	const byCategory = useMemo(() => categoryTotals(inRange), [inRange]);
	const trend = useMemo(
		() => monthlyTotals(receipts, trendEnd(period), 12),
		[receipts, period],
	);
	const days = useMemo(
		() => selectedMonth && dailyTotals(receipts, selectedMonth),
		[receipts, selectedMonth],
	);

	return (
		<div className="space-y-3">
			<div className="lg:hidden">
				<MonthSelector month={month} onChangeMonth={onChangeMonth} />
			</div>
			<div
				key={selectedMonth ?? JSON.stringify(period)}
				className={`space-y-4 lg:grid lg:grid-cols-6 lg:items-start lg:gap-4 lg:space-y-0 ${direction === 1 ? "slide-from-right" : "slide-from-left"}`}
			>
				<div className="relative rounded-2xl bg-emerald-600 p-5 text-white lg:col-span-2">
					<div className="space-y-3">
						<div>
							<p className="text-xs font-medium text-emerald-100">
								{PERIOD_TOTAL_LABEL[period.kind]}
								{excludeFixed && "（固定費を除く）"}
							</p>
							<p className="mt-1 text-3xl font-bold">{formatYen(total)}</p>
							<p className="mt-1 text-xs text-emerald-100">
								{inRange.length} 件のレシート
							</p>
						</div>
						{comparison && (
							<div className="flex gap-2">
								<Change
									label="前月比"
									value={total}
									base={comparison.previous.total}
								/>
								<Change
									label="前年同月比"
									value={total}
									base={comparison.lastYear.total}
								/>
							</div>
						)}
						<FixedCostToggle
							fixedCategories={fixedCategories}
							on={excludeFixed}
							onChange={onChangeExcludeFixed}
						/>
					</div>
					{syncState.kind === "syncing" && (
						<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-600/60">
							<span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
						</div>
					)}
				</div>

				{syncState.kind === "error" && (
					<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 lg:order-first lg:col-span-6 dark:bg-red-950 dark:text-red-300">
						{syncState.message}
					</p>
				)}

				<Card
					title="カテゴリ別"
					className={`lg:order-1 ${days ? "lg:col-span-3" : "lg:col-span-6"}`}
				>
					{byCategory.length === 0 ? (
						<p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
							{selectedMonth
								? "この月のレシートはありません"
								: "この期間のレシートはありません"}
						</p>
					) : (
						<div className="space-y-2.5">
							{byCategory.map(({ category, amount }) => {
								const pct = total > 0 ? (amount / total) * 100 : 0;
								const dimmed =
									activeCategories.size > 0 && !activeCategories.has(category);
								return (
									<button
										key={category}
										type="button"
										onClick={() => onSelectCategory(category)}
										className={`block w-full rounded-lg px-2 py-1.5 text-left transition active:bg-slate-100 lg:hover:bg-slate-50 dark:active:bg-slate-700 lg:dark:hover:bg-slate-700/60 ${dimmed ? "opacity-40" : ""}`}
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

				<Card title="12か月の推移" className="lg:col-span-4">
					<TrendChart
						months={trend}
						selected={selectedMonth}
						onSelect={onSelectMonth}
					/>
				</Card>

				{selectedMonth && days && (
					<Card
						title={`日別（${Number(selectedMonth.slice(5))}月）`}
						className="lg:order-1 lg:col-span-3"
					>
						<DailyHeatmap
							days={days}
							selected={selectedDay}
							onSelect={onSelectDay}
						/>
					</Card>
				)}
			</div>
		</div>
	);
}
