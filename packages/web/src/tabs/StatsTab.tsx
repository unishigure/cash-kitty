import { useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ImageIcon,
	RefreshIcon,
} from "../components/icons";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { categoryColor } from "../lib/categories";
import { formatMonthLabel, formatYen, monthKey } from "../lib/format";
import type { Receipt } from "../lib/types";
import { ReceiptDetail } from "./ReceiptDetail";

type Drive = ReturnType<typeof useGoogleDrive>;

export function StatsTab({
	drive,
	month,
	direction,
	onChangeMonth,
}: {
	drive: Drive;
	month: string;
	direction: 1 | -1;
	onChangeMonth: (delta: 1 | -1) => void;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [canScroll, setCanScroll] = useState({ up: false, down: false });
	const { receipts, syncState, error, status, connect, sync } = drive;
	const syncing = syncState.kind === "syncing";
	const refresh = () =>
		void sync().catch(() => {
			/* surfaced through syncState */
		});

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

	// Clear the category filter when switching months — the categories differ
	// per month, so a stale filter could leave the list empty. Adjusting state
	// during render (vs. an effect) avoids a flash of the stale filtered list.
	const prevMonth = useRef(month);
	if (prevMonth.current !== month) {
		prevMonth.current = month;
		setSelectedCategory(null);
	}

	// Track horizontal swipe to switch months.
	const touchStart = useRef<{ x: number; y: number } | null>(null);

	const handleTouchStart = (e: React.TouchEvent) => {
		// The detail overlay renders inside this container, so its touches bubble
		// up here — ignore swipes while it's open.
		if (selectedId) return;
		const t = e.touches[0];
		if (!t) return;
		touchStart.current = { x: t.clientX, y: t.clientY };
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (selectedId) return;
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

	const monthly = useMemo(
		() => receipts.filter((r) => monthKey(r.date) === month),
		[receipts, month],
	);

	const total = useMemo(
		() => monthly.reduce((sum, r) => sum + r.totalAmount, 0),
		[monthly],
	);

	const byCategory = useMemo(() => {
		const map = new Map<string, number>();
		for (const r of monthly) {
			map.set(r.category, (map.get(r.category) ?? 0) + r.totalAmount);
		}
		return [...map.entries()]
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount);
	}, [monthly]);

	// The receipt list honors the active category filter (tap a category to set)
	// and displays older receipts first.
	const filtered = useMemo(() => {
		const list = selectedCategory
			? monthly.filter((r) => r.category === selectedCategory)
			: [...monthly];

		return list.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				a.createdAt.localeCompare(b.createdAt) ||
				a.id.localeCompare(b.id),
		);
	}, [monthly, selectedCategory]);

	// Derive from the live list so the detail reflects the latest data.
	const selected = selectedId
		? (monthly.find((r) => r.id === selectedId) ?? null)
		: null;

	if (status !== "connected" && monthly.length === 0) {
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
			className="flex flex-1 flex-col space-y-4"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			{/* Month selector */}
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

			{/* Animated month content: re-mounts on month change to replay the slide. */}
			<div
				key={month}
				className={`space-y-4 ${
					direction === 1 ? "slide-from-right" : "slide-from-left"
				}`}
			>
				{/* Summary */}
				<div className="relative rounded-2xl bg-emerald-600 p-5 text-white">
					<p className="text-xs font-medium text-emerald-100">この月の合計</p>
					<p className="mt-1 text-3xl font-bold tabular-nums">
						{formatYen(total)}
					</p>
					<p className="mt-1 text-xs text-emerald-100">
						{monthly.length} 件のレシート
					</p>
					{syncing && (
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

				{/* Category breakdown */}
				{byCategory.length > 0 && (
					<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
						<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
							カテゴリ別
						</h2>
						<div className="space-y-2.5">
							{byCategory.map(({ category, amount }) => {
								const pct = total > 0 ? (amount / total) * 100 : 0;
								const active = selectedCategory === category;
								return (
									<button
										key={category}
										type="button"
										onClick={() =>
											setSelectedCategory(active ? null : category)
										}
										aria-pressed={active}
										className={`block w-full rounded-lg px-2 py-1.5 text-left transition-colors active:bg-slate-100 dark:active:bg-slate-700 ${
											active ? "bg-slate-100 dark:bg-slate-700" : ""
										}`}
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
					</section>
				)}

				{/* Receipt list */}
				<section className="space-y-2">
					<div className="flex items-center justify-between px-1">
						<div className="flex items-center gap-2">
							<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
								明細
							</h2>
							{selectedCategory && (
								<button
									type="button"
									onClick={() => setSelectedCategory(null)}
									aria-label={`${selectedCategory} の絞り込みを解除`}
									className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:active:bg-emerald-900"
								>
									<span>{selectedCategory}</span>
									<span aria-hidden="true">✕</span>
								</button>
							)}
						</div>
						<button
							type="button"
							onClick={refresh}
							disabled={syncing}
							aria-label="更新"
							className="rounded-lg p-1.5 text-emerald-600 active:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:active:bg-emerald-950"
						>
							<RefreshIcon className="h-4 w-4" />
						</button>
					</div>
					{filtered.length === 0 && !syncing ? (
						<p className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
							{selectedCategory
								? "このカテゴリのレシートはありません"
								: "この月のレシートはありません"}
						</p>
					) : (
						<ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
							{filtered.map((r) => (
								<ReceiptRow
									key={r.id}
									receipt={r}
									onOpen={() => setSelectedId(r.id)}
								/>
							))}
						</ul>
					)}
				</section>
			</div>

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

function ReceiptRow({
	receipt,
	onOpen,
}: {
	receipt: Receipt;
	onOpen: () => void;
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onOpen}
				className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-700"
			>
				<span
					className="h-9 w-1.5 shrink-0 rounded-full"
					style={{ backgroundColor: categoryColor(receipt.category) }}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
						{receipt.storeName || "（店名なし）"}
					</p>
					<p className="text-xs text-slate-400 dark:text-slate-500">
						{receipt.date} · {receipt.category}
						{receipt.memo ? ` · ${receipt.memo}` : ""}
					</p>
				</div>
				{receipt.imageFileId && (
					<span
						className="shrink-0 text-slate-300 dark:text-slate-500"
						title="画像あり"
					>
						<ImageIcon className="size-4" />
					</span>
				)}
				<span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-100">
					{formatYen(receipt.totalAmount)}
				</span>
				<span className="shrink-0 text-slate-300 dark:text-slate-600">›</span>
			</button>
		</li>
	);
}
