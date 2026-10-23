import { useEffect, useRef, useState } from "react";
import { TrashIcon } from "../components/icons";
import { ReceiptForm } from "../components/ReceiptForm";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { categoryColor } from "../lib/categories";
import { formatYen } from "../lib/format";
import {
	parseReceiptForm,
	type ReceiptFormState,
	receiptToForm,
} from "../lib/receiptForm";
import type { Receipt } from "../lib/types";

type Drive = ReturnType<typeof useGoogleDrive>;

/**
 * Detail view for a single receipt: shows the image, allows edit & delete.
 * Full screen below `lg`, a centered modal from `lg` up.
 */
export function ReceiptDetail({
	receipt,
	drive,
	onClose,
	navigation,
}: {
	receipt: Receipt;
	drive: Drive;
	onClose: () => void;
	/** Steps through the list's current order; a missing side is the end. */
	navigation?: { prev?: () => void; next?: () => void };
}) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [imageLoading, setImageLoading] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);

	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<ReceiptFormState>(() =>
		receiptToForm(receipt),
	);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const setField = <K extends keyof ReceiptFormState>(
		key: K,
		value: ReceiptFormState[K],
	) => setForm((f) => ({ ...f, [key]: value }));

	// Play a slide-out before unmounting; `onClose` fires when it finishes.
	const [closing, setClosing] = useState(false);

	const requestClose = () => {
		// Reduced-motion users get no animation (and thus no animationend), so
		// close immediately instead of waiting for an event that never fires.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			onClose();
			return;
		}
		setClosing(true);
	};

	const handleAnimationEnd = (e: React.AnimationEvent) => {
		if (closing && e.target === e.currentTarget) onClose();
	};

	// Track horizontal swipe to close the detail (swipe right → back).
	const touchStart = useRef<{ x: number; y: number } | null>(null);

	const handleTouchStart = (e: React.TouchEvent) => {
		// Don't risk discarding edits or hijacking interactions while editing.
		if (editing) return;
		const t = e.touches[0];
		if (!t) return;
		touchStart.current = { x: t.clientX, y: t.clientY };
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		const start = touchStart.current;
		touchStart.current = null;
		if (editing) return;
		const t = e.changedTouches[0];
		if (!start || !t) return;
		const dx = t.clientX - start.x;
		const dy = t.clientY - start.y;
		// Require a clearly horizontal, rightward swipe so vertical scrolling and
		// left swipes aren't hijacked.
		if (dx < 60 || dx <= Math.abs(dy)) return;
		requestClose();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the image changes, not on every `drive`/`receipt` identity change.
	useEffect(() => {
		if (!receipt.imageFileId) return;
		let url: string | null = null;
		let active = true;
		setImageLoading(true);
		setImageError(null);
		drive
			.loadImageUrl(receipt)
			.then((u) => {
				if (!active) {
					if (u) URL.revokeObjectURL(u);
					return;
				}
				url = u;
				setImageUrl(u);
			})
			.catch((e: unknown) => {
				if (active) setImageError(e instanceof Error ? e.message : String(e));
			})
			.finally(() => {
				if (active) setImageLoading(false);
			});
		return () => {
			active = false;
			if (url) URL.revokeObjectURL(url);
		};
	}, [receipt.imageFileId]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (editing) cancelEdit();
				else requestClose();
				return;
			}
			const target = e.target as HTMLElement | null;
			if (editing || target?.closest("input, textarea, select")) return;
			if (e.key === "ArrowLeft") navigation?.prev?.();
			if (e.key === "ArrowRight") navigation?.next?.();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	const startEdit = () => {
		setForm(receiptToForm(receipt));
		setSaveError(null);
		setEditing(true);
	};

	const cancelEdit = () => {
		setEditing(false);
		setSaveError(null);
	};

	const onSave = async () => {
		setSaveError(null);
		const parsed = parseReceiptForm(form);
		if (!parsed.ok) {
			setSaveError(parsed.error);
			return;
		}
		const updated: Receipt = {
			...receipt,
			...parsed.value,
			updatedAt: new Date().toISOString(),
		};
		setSaving(true);
		try {
			await drive.saveReceipt(updated);
			setEditing(false);
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : String(e));
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async () => {
		setDeleting(true);
		setDeleteError(null);
		try {
			await drive.removeReceipt(receipt);
			onClose();
		} catch (e) {
			setDeleteError(e instanceof Error ? e.message : String(e));
			setDeleting(false);
		}
	};

	return (
		<div
			className={`fixed inset-0 z-40 flex flex-col bg-slate-50 lg:items-center lg:justify-center lg:bg-slate-900/40 lg:p-6 lg:backdrop-blur-[2px] dark:bg-slate-950 dark:lg:bg-slate-950/60 ${
				closing ? "detail-exit" : "detail-enter"
			}`}
			onAnimationEnd={handleAnimationEnd}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
		>
			<button
				type="button"
				tabIndex={-1}
				aria-label="閉じる"
				onClick={editing ? undefined : requestClose}
				className="absolute inset-0 hidden cursor-default lg:block"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="レシート詳細"
				className="relative flex min-h-0 flex-1 flex-col lg:max-h-[90dvh] lg:w-full lg:max-w-4xl lg:flex-none lg:overflow-hidden lg:rounded-2xl lg:bg-slate-50 lg:shadow-2xl dark:lg:bg-slate-900"
			>
				{/* Header */}
				<header className="sticky top-0 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-2 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-4 lg:pt-3 dark:border-slate-800 dark:bg-slate-900/95">
					<button
						type="button"
						onClick={editing ? cancelEdit : requestClose}
						className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-600 active:bg-slate-100 dark:text-emerald-400 dark:active:bg-slate-800"
					>
						{editing ? (
							"キャンセル"
						) : (
							<>
								<span className="lg:hidden">‹ 戻る</span>
								<span className="hidden lg:inline">閉じる</span>
							</>
						)}
					</button>
					<span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">
						{editing ? "レシートを編集" : "レシート詳細"}
					</span>
					{!editing && (
						<button
							type="button"
							onClick={startEdit}
							className="rounded-lg px-3 py-1 text-sm font-medium text-emerald-600 active:bg-slate-100 dark:text-emerald-400 dark:active:bg-slate-800"
						>
							編集
						</button>
					)}
				</header>

				<div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col lg:max-w-none">
					<div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0 lg:p-6">
						{/* Image */}
						<div className="flex min-h-45 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-0 lg:min-h-80 dark:border-slate-700 dark:bg-slate-800">
							{imageLoading ? (
								<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
							) : imageUrl ? (
								<img
									src={imageUrl}
									alt="レシート"
									className="max-h-[70vh] w-full object-contain"
								/>
							) : (
								<p className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
									{imageError
										? `画像を読み込めませんでした: ${imageError}`
										: "このレシートには画像がありません"}
								</p>
							)}
						</div>

						<div className="space-y-4">
							{editing ? (
								<ReceiptForm form={form} onChange={setField}>
									{saveError && (
										<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
											{saveError}
										</p>
									)}

									<div className="flex gap-2 pt-1">
										<button
											type="button"
											onClick={() => void onSave()}
											disabled={saving || !parseReceiptForm(form).ok}
											className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
										>
											{saving ? "保存中…" : "変更を保存"}
										</button>
										<button
											type="button"
											onClick={cancelEdit}
											disabled={saving}
											className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
										>
											キャンセル
										</button>
									</div>
								</ReceiptForm>
							) : (
								/* Read-only fields */
								<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
									<Row
										label="店名"
										value={receipt.storeName || "（店名なし）"}
									/>
									<Row
										label="金額"
										value={formatYen(receipt.totalAmount)}
										strong
									/>
									<Row label="日付" value={receipt.date || "—"} />
									<Row
										label="カテゴリ"
										value={
											<span className="inline-flex items-center gap-1.5">
												<span
													className="h-2.5 w-2.5 rounded-full"
													style={{
														backgroundColor: categoryColor(receipt.category),
													}}
												/>
												{receipt.category}
											</span>
										}
									/>
									{receipt.memo && <Row label="メモ" value={receipt.memo} />}
								</div>
							)}

							{!editing && receipt.fullText && (
								<details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
									<summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
										全文を表示
									</summary>
									<pre className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-slate-500 dark:text-slate-400">
										{receipt.fullText}
									</pre>
								</details>
							)}

							{!editing && (
								<>
									{deleteError && (
										<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
											{deleteError}
										</p>
									)}
									{confirming ? (
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => void onDelete()}
												disabled={deleting}
												className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50"
											>
												{deleting ? "削除中…" : "削除する"}
											</button>
											<button
												type="button"
												onClick={() => setConfirming(false)}
												disabled={deleting}
												className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
											>
												キャンセル
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => setConfirming(true)}
											className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600 active:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-400 dark:active:bg-red-950"
										>
											<TrashIcon className="h-4 w-4" /> このレシートを削除
										</button>
									)}
								</>
							)}

							{navigation && !editing && (
								<div className="flex justify-between text-xs font-medium">
									<button
										type="button"
										onClick={navigation.prev}
										disabled={!navigation.prev}
										className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
									>
										← 前へ
									</button>
									<button
										type="button"
										onClick={navigation.next}
										disabled={!navigation.next}
										className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
									>
										次へ →
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function Row({
	label,
	value,
	strong,
}: {
	label: string;
	value: React.ReactNode;
	strong?: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
				{label}
			</span>
			<span
				className={`text-right ${strong ? "text-base font-bold text-slate-900 dark:text-slate-100" : "text-sm text-slate-700 dark:text-slate-200"}`}
			>
				{value}
			</span>
		</div>
	);
}
