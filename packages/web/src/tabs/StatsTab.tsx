import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "../components/icons";
import { SegmentedControl } from "../components/SegmentedControl";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { withoutCategories } from "../lib/analytics";
import {
	INITIAL_FILTERS,
	type ListFilters,
	type StatsView,
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
	const refresh = () =>
		void sync().catch(() => {
			/* surfaced through syncState */
		});
	const showsMonth = view === "analysis" || filters.period.kind === "month";

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
			className="flex flex-1 flex-col space-y-3"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<SegmentedControl
				label="統計の表示"
				options={VIEW_OPTIONS}
				value={view}
				onChange={onChangeView}
			/>

			{view === "list" ? (
				<ReceiptListView
					receipts={receipts}
					filters={filters}
					onChangeFilters={onChangeFilters}
					month={month}
					direction={direction}
					onChangeMonth={onChangeMonth}
					syncState={syncState}
					onRefresh={refresh}
					onOpen={setSelectedId}
				/>
			) : (
				<AnalysisView
					receipts={analysisReceipts}
					fixedCategories={fixedCategories}
					excludeFixed={excluding}
					onChangeExcludeFixed={onChangeExcludeFixed}
					month={month}
					direction={direction}
					onChangeMonth={onChangeMonth}
					onSelectMonth={onSelectMonth}
					onSelectCategory={(category) => {
						onChangeFilters({
							...INITIAL_FILTERS,
							period: { kind: "month" },
							categories: new Set([category]),
						});
						onChangeView("list");
					}}
					onShowDay={(date) => {
						onChangeFilters({
							...INITIAL_FILTERS,
							period: { kind: "range", from: date, to: date },
						});
						onChangeView("list");
					}}
					syncState={syncState}
				/>
			)}

			{selected && (
				<ReceiptDetail
					receipt={selected}
					drive={drive}
					onClose={() => setSelectedId(null)}
				/>
			)}

			{!selected && (canScroll.up || canScroll.down) && (
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
