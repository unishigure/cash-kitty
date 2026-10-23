import { Fragment, useMemo, useState } from "react";
import { RefreshIcon } from "../../components/icons";
import { MonthSelector } from "../../components/MonthSelector";
import { ReceiptRow } from "../../components/ReceiptRow";
import { SegmentedControl } from "../../components/SegmentedControl";
import type { SyncState } from "../../hooks/useGoogleDrive";
import { CATEGORIES, categoryColor } from "../../lib/categories";
import { formatYen } from "../../lib/format";
import { SORTS, type SortKey } from "../../lib/receiptQuery";
import {
	hiddenFilterCount,
	INITIAL_FILTERS,
	type ListFilters,
	PERIOD_TOTAL_LABEL,
	type PeriodChoice,
} from "../../lib/statsFilters";
import type { Receipt } from "../../lib/types";

const PERIOD_OPTIONS = [
	{ value: "month", label: "月" },
	{ value: "all", label: "全期間" },
	{ value: "range", label: "期間指定" },
] as const;

function lastDayOf(month: string): string {
	const [y = 0, m = 1] = month.split("-").map(Number);
	return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-22" -> "10/22 (木)". */
function dayLabel(date: string): string {
	const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
	return `${m}/${d} (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

function parseAmount(text: string): number | undefined {
	if (!text.trim()) return undefined;
	const n = Number(text);
	return Number.isFinite(n) ? n : undefined;
}

export function ReceiptListView({
	receipts,
	results,
	filters,
	onChangeFilters,
	excludedFixed,
	onIncludeFixed,
	month,
	direction,
	onChangeMonth,
	syncState,
	onRefresh,
	onOpen,
	selectedId,
	searchRef,
}: {
	receipts: readonly Receipt[];
	/** `receipts` without `excludedFixed`, narrowed and sorted by `filters`. */
	results: readonly Receipt[];
	filters: ListFilters;
	onChangeFilters: (filters: ListFilters) => void;
	/** Fixed-cost categories left out by 分析's 「固定費を除く」, or null when off. */
	excludedFixed: readonly string[] | null;
	onIncludeFixed: () => void;
	month: string;
	direction: 1 | -1;
	onChangeMonth: (delta: 1 | -1) => void;
	syncState: SyncState;
	onRefresh: () => void;
	onOpen: (id: string) => void;
	selectedId: string | null;
	searchRef: React.Ref<HTMLInputElement>;
}) {
	const [panelOpen, setPanelOpen] = useState(false);
	const syncing = syncState.kind === "syncing";
	const set = (patch: Partial<ListFilters>) =>
		onChangeFilters({ ...filters, ...patch });

	const total = results.reduce((s, r) => s + r.totalAmount, 0);
	const hiddenCount = hiddenFilterCount(filters);
	const narrowed =
		hiddenCount > 0 ||
		filters.text.trim() !== "" ||
		filters.day !== null ||
		excludedFixed !== null;

	const categoryOptions = useMemo(() => {
		const extra = new Set(receipts.map((r) => r.category));
		for (const c of CATEGORIES) extra.delete(c);
		return [...CATEGORIES, ...[...extra].sort()];
	}, [receipts]);

	const toggleCategory = (c: string) => {
		const next = new Set(filters.categories);
		if (next.has(c)) next.delete(c);
		else next.add(c);
		set({ categories: next });
	};

	// The panel lists categories itself, so their chips show only while it is
	// closed. The day and 固定費を除く have no control in the panel, so their
	// chips always show.
	const chips: { label: string; title?: string; remove: () => void }[] = [
		...(excludedFixed
			? [
					{
						label: "固定費を除く",
						title: excludedFixed.join("・"),
						remove: onIncludeFixed,
					},
				]
			: []),
		...(filters.day
			? [{ label: dayLabel(filters.day), remove: () => set({ day: null }) }]
			: []),
		...(panelOpen
			? []
			: [...filters.categories].map((c) => ({
					label: c,
					remove: () => toggleCategory(c),
				}))),
	];

	const changePeriod = (kind: PeriodChoice["kind"]) => {
		if (kind === filters.period.kind) return;
		set({
			period:
				kind === "range"
					? { kind, from: `${month}-01`, to: lastDayOf(month) }
					: { kind },
		});
	};

	const emptyMessage =
		receipts.length === 0
			? "レシートがまだありません"
			: narrowed
				? "条件に一致するレシートはありません"
				: filters.period.kind === "month"
					? "この月のレシートはありません"
					: "この期間のレシートはありません";

	const groupByDate =
		filters.sort === "date-asc" || filters.sort === "date-desc";
	const dayTotals = useMemo(() => {
		const totals = new Map<string, number>();
		for (const r of results) {
			totals.set(r.date, (totals.get(r.date) ?? 0) + r.totalAmount);
		}
		return totals;
	}, [results]);

	const refreshButton = (
		<button
			type="button"
			onClick={onRefresh}
			disabled={syncing}
			aria-label="更新"
			className="rounded-lg p-1.5 text-emerald-600 active:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:active:bg-emerald-950"
		>
			<RefreshIcon className="h-4 w-4" />
		</button>
	);

	const content = (
		<div className="space-y-4 lg:space-y-0">
			<div className="relative rounded-2xl bg-emerald-600 p-5 text-white lg:hidden">
				<p className="text-xs font-medium text-emerald-100">
					{PERIOD_TOTAL_LABEL[filters.period.kind]}
					{narrowed && "（絞り込み中）"}
				</p>
				<p className="mt-1 text-3xl font-bold">{formatYen(total)}</p>
				<p className="mt-1 text-xs text-emerald-100">
					{results.length} 件のレシート
				</p>
				{syncing && (
					<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-600/60">
						<span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
					</div>
				)}
			</div>

			{syncState.kind === "error" && (
				<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 lg:m-4 dark:bg-red-950 dark:text-red-300">
					{syncState.message}
				</p>
			)}

			<section className="space-y-2 lg:space-y-0">
				<div className="flex items-center justify-between px-1 lg:hidden">
					<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
						明細
					</h2>
					{refreshButton}
				</div>
				{results.length === 0 && !syncing ? (
					<div className="space-y-3 rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400 lg:m-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
						<p>{emptyMessage}</p>
						{narrowed && receipts.length > 0 && (
							<button
								type="button"
								onClick={() => {
									onChangeFilters({
										...INITIAL_FILTERS,
										period: filters.period,
									});
									if (excludedFixed) onIncludeFixed();
								}}
								className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
							>
								条件をクリア
							</button>
						)}
					</div>
				) : (
					<ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:overflow-visible lg:rounded-none lg:border-0 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
						{results.map((r, i) => (
							<Fragment key={r.id}>
								{groupByDate && r.date !== results[i - 1]?.date && (
									<li className="sticky top-0 z-1 hidden justify-between bg-slate-50 px-4 py-1 text-[11px] font-medium text-slate-400 lg:flex dark:bg-slate-900 dark:text-slate-500">
										<span>{dayLabel(r.date)}</span>
										<span className="tabular-nums">
											{formatYen(dayTotals.get(r.date) ?? 0)}
										</span>
									</li>
								)}
								<ReceiptRow
									receipt={r}
									selected={r.id === selectedId}
									onOpen={() => onOpen(r.id)}
								/>
							</Fragment>
						))}
					</ul>
				)}
			</section>
		</div>
	);

	return (
		<div className="space-y-3 lg:flex lg:h-full lg:flex-col lg:space-y-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white dark:lg:border-slate-700 dark:lg:bg-slate-800">
			<div className="space-y-3 lg:space-y-2 lg:border-b lg:border-slate-200 lg:p-4 dark:lg:border-slate-700">
				<div className="hidden items-center gap-2 lg:flex">
					<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
						明細
					</h2>
					<span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
						<b className="text-slate-800 dark:text-slate-100">
							{results.length}
						</b>
						件{" "}
						<b className="tabular-nums text-slate-800 dark:text-slate-100">
							{formatYen(total)}
						</b>
						{narrowed && "（絞り込み中）"}
					</span>
					{refreshButton}
				</div>
				<SegmentedControl
					label="期間"
					size="sm"
					options={PERIOD_OPTIONS}
					value={filters.period.kind}
					onChange={changePeriod}
				/>

				{filters.period.kind === "month" && (
					<MonthSelector month={month} onChangeMonth={onChangeMonth} />
				)}
				{filters.period.kind === "range" && (
					<div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
						<input
							type="date"
							aria-label="開始日"
							value={filters.period.from}
							max={filters.period.to || undefined}
							onChange={(e) =>
								filters.period.kind === "range" &&
								set({ period: { ...filters.period, from: e.target.value } })
							}
							className="input min-w-0 flex-1 appearance-none"
						/>
						<span className="shrink-0 text-slate-400">〜</span>
						<input
							type="date"
							aria-label="終了日"
							value={filters.period.to}
							min={filters.period.from || undefined}
							onChange={(e) =>
								filters.period.kind === "range" &&
								set({ period: { ...filters.period, to: e.target.value } })
							}
							className="input min-w-0 flex-1 appearance-none"
						/>
					</div>
				)}

				<div className="flex gap-2">
					<input
						type="search"
						value={filters.text}
						onChange={(e) => set({ text: e.target.value })}
						placeholder="店名・メモ・全文で検索"
						aria-label="検索"
						ref={searchRef}
						className="input min-w-0 flex-1 placeholder:text-slate-400"
					/>
					<button
						type="button"
						onClick={() => setPanelOpen((o) => !o)}
						aria-expanded={panelOpen}
						className={`relative shrink-0 rounded-lg border px-3 text-sm font-medium ${
							panelOpen || hiddenCount > 0
								? "border-emerald-500 text-emerald-700 dark:text-emerald-300"
								: "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
						} bg-white active:bg-slate-50 dark:bg-slate-800 dark:active:bg-slate-700`}
					>
						絞り込み
						{hiddenCount > 0 && (
							<span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-bold text-white">
								{hiddenCount}
							</span>
						)}
					</button>
				</div>

				{panelOpen && (
					<div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
						<div>
							<div className="mb-2 flex items-center justify-between">
								<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
									カテゴリ（複数選択）
								</span>
								{filters.categories.size > 0 && (
									<button
										type="button"
										onClick={() => set({ categories: new Set() })}
										className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
									>
										すべて解除
									</button>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								{categoryOptions.map((c) => {
									const on = filters.categories.has(c);
									return (
										<button
											key={c}
											type="button"
											aria-pressed={on}
											onClick={() => toggleCategory(c)}
											className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
												on
													? "bg-emerald-600 text-white"
													: "bg-slate-100 text-slate-600 active:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:active:bg-slate-600"
											}`}
										>
											<span
												className="h-2 w-2 rounded-full ring-1 ring-white/70"
												style={{ backgroundColor: categoryColor(c) }}
											/>
											{c}
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
								金額 (円)
							</span>
							<div className="flex items-center gap-2">
								<input
									type="number"
									inputMode="numeric"
									aria-label="最小金額"
									placeholder="下限なし"
									value={filters.minAmount ?? ""}
									onChange={(e) =>
										set({ minAmount: parseAmount(e.target.value) })
									}
									className="input min-w-0 flex-1 placeholder:text-slate-400"
								/>
								<span className="shrink-0 text-slate-400">〜</span>
								<input
									type="number"
									inputMode="numeric"
									aria-label="最大金額"
									placeholder="上限なし"
									value={filters.maxAmount ?? ""}
									onChange={(e) =>
										set({ maxAmount: parseAmount(e.target.value) })
									}
									className="input min-w-0 flex-1 placeholder:text-slate-400"
								/>
							</div>
						</div>

						<label className="block">
							<span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
								並び順
							</span>
							<select
								value={filters.sort}
								onChange={(e) => set({ sort: e.target.value as SortKey })}
								className="input"
							>
								{(Object.keys(SORTS) as SortKey[]).map((k) => (
									<option key={k} value={k}>
										{SORTS[k].label}
									</option>
								))}
							</select>
						</label>
					</div>
				)}

				{chips.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{chips.map(({ label, title, remove }) => (
							<button
								key={label}
								type="button"
								onClick={remove}
								title={title}
								aria-label={`${label} の絞り込みを解除`}
								className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:active:bg-emerald-900"
							>
								<span>{label}</span>
								<span aria-hidden="true">✕</span>
							</button>
						))}
					</div>
				)}
			</div>

			<div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
				{filters.period.kind === "month" ? (
					<div
						key={month}
						className={direction === 1 ? "slide-from-right" : "slide-from-left"}
					>
						{content}
					</div>
				) : (
					content
				)}
			</div>
		</div>
	);
}
