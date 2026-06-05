import { useMemo, useState } from "react";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { categoryColor } from "../lib/categories";
import {
	currentMonthKey,
	formatMonthLabel,
	formatYen,
	monthKey,
	shiftMonth,
} from "../lib/format";
import type { Receipt } from "../lib/types";
import { ReceiptDetail } from "./ReceiptDetail";

type Drive = ReturnType<typeof useGoogleDrive>;

export function StatsTab({ drive }: { drive: Drive }) {
	const [month, setMonth] = useState<string>(currentMonthKey());
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { receipts, loading, error, status, connect, refresh } = drive;

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

	// Derive from the live list so the detail reflects the latest data.
	const selected = selectedId
		? (receipts.find((r) => r.id === selectedId) ?? null)
		: null;

	if (status !== "connected" && receipts.length === 0) {
		return (
			<div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
				<p className="text-base font-bold text-slate-800">
					Google Drive に未接続です
				</p>
				<p className="text-sm text-slate-500">
					保存したレシートを表示するには Google Drive に接続してください。
				</p>
				{error && <p className="text-xs text-red-600">{error}</p>}
				<button
					type="button"
					onClick={() => void connect()}
					disabled={loading}
					className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
				>
					{loading ? "接続中…" : "Google Drive に接続"}
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Month selector */}
			<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-2">
				<button
					type="button"
					onClick={() => setMonth((m) => shiftMonth(m, -1))}
					className="rounded-lg px-3 py-1.5 text-lg text-slate-500 active:bg-slate-100"
					aria-label="前の月"
				>
					‹
				</button>
				<span className="text-base font-bold">{formatMonthLabel(month)}</span>
				<button
					type="button"
					onClick={() => setMonth((m) => shiftMonth(m, 1))}
					className="rounded-lg px-3 py-1.5 text-lg text-slate-500 active:bg-slate-100"
					aria-label="次の月"
				>
					›
				</button>
			</div>

			{/* Summary */}
			<div className="rounded-2xl bg-emerald-600 p-5 text-white">
				<p className="text-xs font-medium text-emerald-100">この月の合計</p>
				<p className="mt-1 text-3xl font-bold tabular-nums">
					{formatYen(total)}
				</p>
				<p className="mt-1 text-xs text-emerald-100">
					{monthly.length} 件のレシート
				</p>
			</div>

			{loading && (
				<p className="text-center text-sm text-slate-400">読み込み中…</p>
			)}
			{error && (
				<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</p>
			)}

			{/* Category breakdown */}
			{byCategory.length > 0 && (
				<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
					<h2 className="text-sm font-bold text-slate-700">カテゴリ別</h2>
					<div className="space-y-2.5">
						{byCategory.map(({ category, amount }) => {
							const pct = total > 0 ? (amount / total) * 100 : 0;
							return (
								<div key={category}>
									<div className="mb-1 flex justify-between text-xs">
										<span className="font-medium text-slate-600">
											{category}
										</span>
										<span className="tabular-nums text-slate-500">
											{formatYen(amount)}（{pct.toFixed(0)}%）
										</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-slate-100">
										<div
											className="h-full rounded-full"
											style={{
												width: `${pct}%`,
												backgroundColor: categoryColor(category),
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* Receipt list */}
			<section className="space-y-2">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-sm font-bold text-slate-700">明細</h2>
					<button
						type="button"
						onClick={() => void refresh()}
						className="text-xs font-medium text-emerald-600"
					>
						更新
					</button>
				</div>
				{monthly.length === 0 && !loading ? (
					<p className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
						この月のレシートはありません
					</p>
				) : (
					<ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
						{monthly.map((r) => (
							<ReceiptRow
								key={r.id}
								receipt={r}
								onOpen={() => setSelectedId(r.id)}
							/>
						))}
					</ul>
				)}
			</section>

			{selected && (
				<ReceiptDetail
					receipt={selected}
					drive={drive}
					onClose={() => setSelectedId(null)}
				/>
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
				className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
			>
				<span
					className="h-9 w-1.5 shrink-0 rounded-full"
					style={{ backgroundColor: categoryColor(receipt.category) }}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-slate-800">
						{receipt.storeName || "（店名なし）"}
					</p>
					<p className="text-xs text-slate-400">
						{receipt.date} · {receipt.category}
						{receipt.memo ? ` · ${receipt.memo}` : ""}
					</p>
				</div>
				{receipt.imageFileId && (
					<span className="shrink-0 text-xs text-slate-300" title="画像あり">
						🖼
					</span>
				)}
				<span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800">
					{formatYen(receipt.totalAmount)}
				</span>
				<span className="shrink-0 text-slate-300">›</span>
			</button>
		</li>
	);
}
