import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "../components/icons";
import { SegmentedControl } from "../components/SegmentedControl";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { withoutCategories } from "../lib/analytics";
import { filterReceipts } from "../lib/receiptQuery";
import {
	INITIAL_FILTERS,
	type ListFilters,
	type StatsView,
	toQuery,
} from "../lib/statsFilters";
import { ReceiptDetail } from "./ReceiptDetail";
import { AnalysisView } from "./stats/AnalysisView";
import { ReceiptListView } from "./stats/ReceiptListView";

type Drive = ReturnType<typeof useGoogleDrive>;

const VIEW_OPTIONS = [
	{ value: "list", label: "明細" },
	{ value: "analysis", label: "分析" },
] as const;

export function StatsTab({
	drive,
	view,
	onChangeView,
	month,
	direction,
	onChangeMonth,
	onSelectMonth,
	filters,
	onChangeFilters,
	excludeFixed,
	onChangeExcludeFixed,
	desktop,
}: {
	drive: Drive;
	view: StatsView;
	onChangeView: (view: StatsView) => void;
	month: string;
	direction: 1 | -1;
	onChangeMonth: (delta: 1 | -1) => void;
	onSelectMonth: (month: string) => void;
	filters: ListFilters;
	onChangeFilters: (filters: ListFilters) => void;
	excludeFixed: boolean;
	onChangeExcludeFixed: (exclude: boolean) => void;
	/** From `lg` up both views show side by side and share the list's period. */
	desktop: boolean;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [canScroll, setCanScroll] = useState({ up: false, down: false });
	const { receipts, syncState, error, status, connect, sync, preferences } =
		drive;
	const { fixedCategories } = preferences;
	const excluding = excludeFixed && fixedCategories.length > 0;
	const analysisReceipts = useMemo(
		() => withoutCategories(receipts, excluding ? fixedCategories : []),
		[receipts, excluding, fixedCategories],
	);
	const monthPeriod = useMemo(
		() => ({ kind: "month" as const, month }),
		[month],
	);
	const query = useMemo(() => toQuery(filters, month), [filters, month]);
	const results = useMemo(
		() => filterReceipts(receipts, query),
		[receipts, query],
	);
	const searchRef = useRef<HTMLInputElement>(null);
	const refresh = () =>
		void sync().catch(() => {
			/* surfaced through syncState */
		});
	const showsMonth = view === "analysis" || filters.period.kind === "month";

	useEffect(() => {
		if (!desktop) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable]")) {
				return;
			}
			e.preventDefault();
			searchRef.current?.focus();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [desktop]);

	useEffect(() => {
		const updateScrollState = () => {
			const root = document.documentElement;
			const top = window.scrollY || root.scrollTop;
			const max = Math.max(0, root.scrollHeight - window.innerHeight);
			const next = { up: top > 8, down: top < max - 8 };
			setCanScroll((current) =>
				current.up === next.up && current.down === next.down ? current : next,
			);
		};

		updateScrollState();
		window.addEventListener("scroll", updateScrollState, { passive: true });
		window.addEventListener("resize", updateScrollState);

		const observer = new ResizeObserver(updateScrollState);
		observer.observe(document.body);

		return () => {
			window.removeEventListener("scroll", updateScrollState);
			window.removeEventListener("resize", updateScrollState);
			observer.disconnect();
		};
	}, []);

	const scrollToEdge = (edge: "top" | "bottom") => {
		window.scrollTo({
			top: edge === "top" ? 0 : document.documentElement.scrollHeight,
			behavior: "smooth",
		});
	};

	// Track horizontal swipe to switch months.
	const touchStart = useRef<{ x: number; y: number } | null>(null);

	const handleTouchStart = (e: React.TouchEvent) => {
		// The detail overlay renders inside this container, so its touches bubble
		// up here — ignore swipes while it's open.
		if (selectedId || !showsMonth) return;
		const t = e.touches[0];
		if (!t) return;
		touchStart.current = { x: t.clientX, y: t.clientY };
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (selectedId || !showsMonth) return;
		const start = touchStart.current;
		touchStart.current = null;
		const t = e.changedTouches[0];
		if (!start || !t) return;
		const dx = t.clientX - start.x;
		const dy = t.clientY - start.y;
		// Require a clearly horizontal swipe so vertical scrolling isn't hijacked.
		if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return;
		// Swipe left → next month, swipe right → previous month.
		onChangeMonth(dx < 0 ? 1 : -1);
	};

	// Derive from the live collection so the detail reflects the latest data.
	const selected = selectedId
		? (receipts.find((r) => r.id === selectedId) ?? null)
		: null;
	const index = selected ? results.indexOf(selected) : -1;
	const prevId = index > 0 ? results[index - 1]?.id : undefined;
	const nextId = index >= 0 ? results[index + 1]?.id : undefined;

	const list = (
		<ReceiptListView
			receipts={receipts}
			results={results}
			filters={filters}
			onChangeFilters={onChangeFilters}
			month={month}
			direction={direction}
			onChangeMonth={onChangeMonth}
			syncState={syncState}
			onRefresh={refresh}
			onOpen={setSelectedId}
			selectedId={selectedId}
			searchRef={searchRef}
		/>
	);

	// Below lg, a tap leaves 分析 for a freshly filtered 明細. From lg up the
	// list sits alongside, so a tap narrows it in place and keeps the period
	// both columns share.
	const analysis = (
		<AnalysisView
			receipts={analysisReceipts}
			fixedCategories={fixedCategories}
			excludeFixed={excluding}
			onChangeExcludeFixed={onChangeExcludeFixed}
			period={desktop ? query.period : monthPeriod}
			month={month}
			direction={direction}
			onChangeMonth={onChangeMonth}
			onSelectMonth={(target) => {
				onSelectMonth(target);
				if (desktop && filters.period.kind !== "month") {
					onChangeFilters({ ...filters, period: { kind: "month" } });
				}
			}}
			activeCategories={desktop ? filters.categories : undefined}
			onSelectCategory={(category) => {
				if (desktop) {
					const only =
						filters.categories.size === 1 && filters.categories.has(category);
					onChangeFilters({
						...filters,
						categories: only ? new Set() : new Set([category]),
					});
					return;
				}
				onChangeFilters({
					...INITIAL_FILTERS,
					period: { kind: "month" },
					categories: new Set([category]),
				});
				onChangeView("list");
			}}
			selectedDay={filters.day}
			onSelectDay={(date) => {
				if (desktop) {
					onChangeFilters({
						...filters,
						day: filters.day === date ? null : date,
					});
					return;
				}
				onChangeFilters({
					...INITIAL_FILTERS,
					period: { kind: "month" },
					day: date,
				});
				onChangeView("list");
			}}
			syncState={syncState}
		/>
	);

	if (status !== "connected" && receipts.length === 0) {
		return (
			<div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
				<p className="text-base font-bold text-slate-800 dark:text-slate-100">
					Google Drive に未接続です
				</p>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					保存したレシートを表示するには Google Drive に接続してください。
				</p>
				{error && (
					<p className="text-xs text-red-600 dark:text-red-400">{error}</p>
				)}
				<button
					type="button"
					onClick={() => void connect()}
					disabled={status === "connecting"}
					className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
				>
					{status === "connecting" ? "接続中…" : "Google Drive に接続"}
				</button>
			</div>
		);
	}

	return (
		<div
			className="flex flex-1 flex-col gap-3"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			{desktop ? (
				<div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-5">
					{analysis}
					<div className="sticky top-19 h-[calc(100dvh-6rem)]">{list}</div>
				</div>
			) : (
				<>
					<SegmentedControl
						label="統計の表示"
						options={VIEW_OPTIONS}
						value={view}
						onChange={onChangeView}
					/>
					{view === "list" ? list : analysis}
				</>
			)}

			{selected && (
				<ReceiptDetail
					key={selected.id}
					receipt={selected}
					drive={drive}
					onClose={() => setSelectedId(null)}
					navigation={
						desktop
							? {
									prev: prevId ? () => setSelectedId(prevId) : undefined,
									next: nextId ? () => setSelectedId(nextId) : undefined,
								}
							: undefined
					}
				/>
			)}

			{!desktop && !selected && (canScroll.up || canScroll.down) && (
				<div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
					<div className="mx-auto flex max-w-lg justify-end px-4">
						<div className="flex flex-col gap-2">
							{canScroll.up && (
								<button
									type="button"
									onClick={() => scrollToEdge("top")}
									aria-label="一番上へ移動"
									title="一番上へ移動"
									className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 active:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:active:bg-emerald-400"
								>
									<ArrowUpIcon className="h-5 w-5" />
								</button>
							)}
							{canScroll.down && (
								<button
									type="button"
									onClick={() => scrollToEdge("bottom")}
									aria-label="一番下へ移動"
									title="一番下へ移動"
									className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 active:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:active:bg-emerald-400"
								>
									<ArrowDownIcon className="h-5 w-5" />
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
