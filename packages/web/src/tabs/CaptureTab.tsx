import { useEffect, useRef } from "react";
import { CheckIcon, RefreshIcon } from "../components/icons";
import type { OcrHealthApi } from "../hooks/useOcrHealth";
import type { ReceiptCapture } from "../hooks/useReceiptCapture";
import { CATEGORIES } from "../lib/categories";
import type { AppSettings } from "../lib/settings";

export function CaptureTab({
	settings,
	capture,
	ocrHealth,
	onGoSettings,
}: {
	settings: AppSettings;
	capture: ReceiptCapture;
	ocrHealth: OcrHealthApi;
	onGoSettings: () => void;
}) {
	const {
		preview,
		analyzing,
		saving,
		error,
		done,
		form,
		setField,
		setError,
		analyze,
		reset,
		save,
	} = capture;
	const fileRef = useRef<HTMLInputElement>(null);
	const ocrOnline = ocrHealth.status === "online";

	// Keep the native file input in sync with the (shell-held) capture state:
	// once the form is cleared the input must be emptied too, otherwise picking
	// the same file again would not re-fire `change`.
	useEffect(() => {
		if (!preview && fileRef.current) fileRef.current.value = "";
	}, [preview]);

	const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) void analyze(file);
	};

	const onSave = async () => {
		const ok = await save();
		if (ok) window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const onReset = () => {
		reset();
		setError(null);
	};

	if (!settings.googleClientId) {
		return (
			<NoticeCard
				title="セットアップが必要です"
				body="レシートを保存するには、設定タブで Google クライアント ID を登録してください。"
				actionLabel="設定を開く"
				onAction={onGoSettings}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{/*
			 * No `capture` attribute: leaving it off lets mobile browsers offer
			 * both the camera and the existing photo library, instead of forcing
			 * the camera open directly.
			 */}
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={onPickImage}
			/>

			{/*
			 * OCR connection status (checking / offline + retry) lives in the
			 * header; capture is blocked here while the API is unreachable.
			 */}

			{/* Capture / preview area */}
			{ocrOnline && (
				<>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
					>
						{preview ? (
							<img
								src={preview}
								alt="レシート"
								className="h-full w-full object-contain"
							/>
						) : (
							<div className="flex flex-col items-center gap-2 px-6 text-center">
								<span className="text-4xl">📷</span>
								<span className="text-sm font-medium">
									タップして撮影 / 画像を選択
								</span>
							</div>
						)}
					</button>

					{preview && (
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
						>
							撮り直す
						</button>
					)}
				</>
			)}

			{analyzing && (
				<div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
					<Spinner /> レシートを解析中…
				</div>
			)}

			{error && (
				<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
					{error}
				</p>
			)}

			{done && (
				<p className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
					<CheckIcon className="h-4 w-4" /> Google Drive に保存しました
				</p>
			)}

			{/* Edit form */}
			<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
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

				<Field label="日付" required>
					<input
						type="date"
						value={form.date}
						onChange={(e) => setField("date", e.target.value)}
						className="input min-w-0 appearance-none"
					/>
				</Field>

				<div className="block">
					<span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
						カテゴリ
						<span className="ml-0.5 text-red-500">*</span>
					</span>
					<div className="flex flex-wrap gap-2">
						{CATEGORIES.map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => setField("category", c)}
								className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
									form.category === c
										? "bg-emerald-600 text-white"
										: "bg-slate-100 text-slate-600 active:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:active:bg-slate-600"
								}`}
							>
								{c}
							</button>
						))}
					</div>
				</div>

				<Field label="メモ">
					<input
						type="text"
						value={form.memo}
						onChange={(e) => setField("memo", e.target.value)}
						placeholder="任意"
						className="input placeholder:text-slate-300"
					/>
				</Field>
			</div>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={onReset}
					disabled={saving || analyzing}
					aria-label="リセット"
					title="リセット"
					className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition active:scale-[0.99] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
				>
					<RefreshIcon className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={
						saving ||
						analyzing ||
						!form.totalAmount.trim() ||
						!form.date ||
						!form.category
					}
					className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
				>
					{saving ? "保存中…" : "保存する"}
				</button>
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
		// biome-ignore lint/a11y/noLabelWithoutControl: the form control is supplied via `children`.
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
				{label}
				{required && <span className="ml-0.5 text-red-500">*</span>}
			</span>
			{children}
		</label>
	);
}

function Spinner() {
	return (
		<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
	);
}

function NoticeCard({
	title,
	body,
	actionLabel,
	onAction,
}: {
	title: string;
	body: string;
	actionLabel: string;
	onAction: () => void;
}) {
	return (
		<div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
			<p className="text-base font-bold text-slate-800 dark:text-slate-100">
				{title}
			</p>
			<p className="text-sm text-slate-500 dark:text-slate-400">{body}</p>
			<button
				type="button"
				onClick={onAction}
				className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
			>
				{actionLabel}
			</button>
		</div>
	);
}
