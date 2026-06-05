import { useEffect, useState } from "react";
import { TrashIcon } from "../components/icons";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { CATEGORIES, categoryColor } from "../lib/categories";
import { formatYen } from "../lib/format";
import type { Receipt } from "../lib/types";

type Drive = ReturnType<typeof useGoogleDrive>;

interface FormState {
	storeName: string;
	totalAmount: string;
	date: string;
	category: string;
	memo: string;
}

const toForm = (r: Receipt): FormState => ({
	storeName: r.storeName,
	totalAmount: String(r.totalAmount),
	date: r.date,
	category: r.category,
	memo: r.memo ?? "",
});

/** Full-screen detail view for a single receipt: shows the image, allows edit & delete. */
export function ReceiptDetail({
	receipt,
	drive,
	onClose,
}: {
	receipt: Receipt;
	drive: Drive;
	onClose: () => void;
}) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [imageLoading, setImageLoading] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);

	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<FormState>(() => toForm(receipt));
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

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

	const startEdit = () => {
		setForm(toForm(receipt));
		setSaveError(null);
		setEditing(true);
	};

	const cancelEdit = () => {
		setEditing(false);
		setSaveError(null);
	};

	const onSave = async () => {
		setSaveError(null);
		const amount = Number(form.totalAmount);
		if (!form.totalAmount.trim()) {
			setSaveError("金額を入力してください。");
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			setSaveError("金額が正しくありません。");
			return;
		}
		if (!form.category) {
			setSaveError("カテゴリを選択してください。");
			return;
		}
		const updated: Receipt = {
			...receipt,
			storeName: form.storeName.trim(),
			totalAmount: Math.round(amount),
			date: form.date,
			category: form.category,
			memo: form.memo.trim() || undefined,
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
		<div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
			{/* Header */}
			<header className="sticky top-0 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-2 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
				<button
					type="button"
					onClick={editing ? cancelEdit : onClose}
					className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-600 active:bg-slate-100"
				>
					{editing ? "キャンセル" : "‹ 戻る"}
				</button>
				<span className="flex-1 text-sm font-bold text-slate-700">
					{editing ? "レシートを編集" : "レシート詳細"}
				</span>
				{!editing && (
					<button
						type="button"
						onClick={startEdit}
						className="rounded-lg px-3 py-1 text-sm font-medium text-emerald-600 active:bg-slate-100"
					>
						編集
					</button>
				)}
			</header>

			<div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
				{/* Image */}
				<div className="flex min-h-45 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
					{imageLoading ? (
						<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
					) : imageUrl ? (
						<img
							src={imageUrl}
							alt="レシート"
							className="max-h-[70vh] w-full object-contain"
						/>
					) : (
						<p className="px-6 py-10 text-center text-sm text-slate-400">
							{imageError
								? `画像を読み込めませんでした: ${imageError}`
								: "このレシートには画像がありません"}
						</p>
					)}
				</div>

				{editing ? (
					/* Edit form */
					<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
						<Field label="店名">
							<input
								type="text"
								value={form.storeName}
								onChange={(e) => setField("storeName", e.target.value)}
								placeholder="例: スーパーマーケット"
								className="input placeholder:text-slate-300"
							/>
						</Field>

						<Field label="金額 (円)" required>
							<input
								type="number"
								inputMode="numeric"
								value={form.totalAmount}
								onChange={(e) => setField("totalAmount", e.target.value)}
								placeholder="0"
								className="input"
							/>
						</Field>

						<Field label="日付">
							<input
								type="date"
								value={form.date}
								onChange={(e) => setField("date", e.target.value)}
								className="input min-w-0 appearance-none"
							/>
						</Field>

						<Field label="カテゴリ" required>
							<div className="flex flex-wrap gap-2">
								{CATEGORIES.map((c) => (
									<button
										key={c}
										type="button"
										onClick={() => setField("category", c)}
										className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
											form.category === c
												? "bg-emerald-600 text-white"
												: "bg-slate-100 text-slate-600 active:bg-slate-200"
										}`}
									>
										{c}
									</button>
								))}
							</div>
						</Field>

						<Field label="メモ">
							<input
								type="text"
								value={form.memo}
								onChange={(e) => setField("memo", e.target.value)}
								placeholder="任意"
								className="input placeholder:text-slate-300"
							/>
						</Field>

						{saveError && (
							<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
								{saveError}
							</p>
						)}

						<div className="flex gap-2 pt-1">
							<button
								type="button"
								onClick={() => void onSave()}
								disabled={saving || !form.totalAmount.trim() || !form.category}
								className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
							>
								{saving ? "保存中…" : "変更を保存"}
							</button>
							<button
								type="button"
								onClick={cancelEdit}
								disabled={saving}
								className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600"
							>
								キャンセル
							</button>
						</div>
					</div>
				) : (
					/* Read-only fields */
					<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
						<Row label="店名" value={receipt.storeName || "（店名なし）"} />
						<Row label="金額" value={formatYen(receipt.totalAmount)} strong />
						<Row label="日付" value={receipt.date || "—"} />
						<Row
							label="カテゴリ"
							value={
								<span className="inline-flex items-center gap-1.5">
									<span
										className="h-2.5 w-2.5 rounded-full"
										style={{ backgroundColor: categoryColor(receipt.category) }}
									/>
									{receipt.category}
								</span>
							}
						/>
						{receipt.memo && <Row label="メモ" value={receipt.memo} />}
					</div>
				)}

				{!editing && receipt.fullText && (
					<details className="rounded-2xl border border-slate-200 bg-white p-4">
						<summary className="cursor-pointer text-sm font-medium text-slate-600">
							全文を表示
						</summary>
						<pre className="mt-2 whitespace-pre-wrap wrap-break-word text-xs text-slate-500">
							{receipt.fullText}
						</pre>
					</details>
				)}

				{!editing && (
					<>
						{deleteError && (
							<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
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
									className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-600"
								>
									キャンセル
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirming(true)}
								className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600 active:bg-red-50"
							>
								<TrashIcon className="h-4 w-4" /> このレシートを削除
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="block">
			<span className="mb-1 block text-xs font-medium text-slate-500">
				{label}
				{required && <span className="ml-0.5 text-red-500">*</span>}
			</span>
			{children}
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
			<span className="shrink-0 text-xs font-medium text-slate-400">
				{label}
			</span>
			<span
				className={`text-right ${strong ? "text-base font-bold text-slate-900" : "text-sm text-slate-700"}`}
			>
				{value}
			</span>
		</div>
	);
}
