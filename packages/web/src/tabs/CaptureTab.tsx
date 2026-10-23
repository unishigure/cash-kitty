import { useRef, useState } from "react";
import { CheckIcon, RefreshIcon } from "../components/icons";
import { ReceiptForm } from "../components/ReceiptForm";
import type { OcrHealthApi } from "../hooks/useOcrHealth";
import type { ReceiptCapture } from "../hooks/useReceiptCapture";
import type { CaptureItem, ItemState } from "../lib/captureQueue";
import {
	type AppConfig,
	MISSING_CLIENT_ID_MESSAGE,
	MISSING_OCR_URL_MESSAGE,
} from "../lib/config";
import { EMPTY_RECEIPT_FORM, parseReceiptForm } from "../lib/receiptForm";

const STATE_LABEL: Record<ItemState["kind"], string> = {
	queued: "解析待ち",
	analyzing: "解析中",
	review: "確認待ち",
	failed: "解析失敗",
	saving: "保存中",
	saved: "保存済み",
	skipped: "スキップ",
};

const imageFiles = (files: FileList | null | undefined) =>
	[...(files ?? [])].filter((f) => f.type.startsWith("image/"));

export function CaptureTab({
	config,
	capture,
	ocrHealth,
}: {
	config: AppConfig;
	capture: ReceiptCapture;
	ocrHealth: OcrHealthApi;
}) {
	const {
		queue,
		current,
		progress,
		done,
		addImages,
		retake,
		setField,
		skip,
		retry,
		save,
	} = capture;
	const fileRef = useRef<HTMLInputElement>(null);
	const retakeRef = useRef(false);
	const [dragging, setDragging] = useState(false);
	// Without OCR configured, photos are still kept and entered by hand. While
	// a configured server is unreachable, capture stays blocked.
	const canPick =
		ocrHealth.status === "online" || ocrHealth.status === "unconfigured";
	const state = current?.state;
	const form = current?.form ?? EMPTY_RECEIPT_FORM;
	const busy = state?.kind === "saving" || state?.kind === "analyzing";
	const batch = progress.total > 1;

	const pick = (asRetake: boolean) => {
		retakeRef.current = asRetake;
		fileRef.current?.click();
	};

	const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
		const [first, ...rest] = imageFiles(e.target.files);
		e.target.value = "";
		if (!first) return;
		if (retakeRef.current) {
			retake(first);
			addImages(rest);
		} else {
			addImages([first, ...rest]);
		}
	};

	const onSave = async () => {
		const ok = await save();
		if (ok) window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const dropHandlers = canPick
		? {
				onDragOver: (e: React.DragEvent) => {
					if (!e.dataTransfer.types.includes("Files")) return;
					e.preventDefault();
					setDragging(true);
				},
				onDragLeave: (e: React.DragEvent) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
						setDragging(false);
					}
				},
				onDrop: (e: React.DragEvent) => {
					e.preventDefault();
					setDragging(false);
					addImages(imageFiles(e.dataTransfer.files));
				},
			}
		: {};

	if (!config.googleClientId) {
		return (
			<div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
				<p className="text-base font-bold text-slate-800 dark:text-slate-100">
					レシートを保存できません
				</p>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					{MISSING_CLIENT_ID_MESSAGE}。ビルド時の環境変数に Google OAuth
					クライアント ID を設定してください。
				</p>
			</div>
		);
	}

	return (
		<div
			className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0"
			{...dropHandlers}
		>
			{/*
			 * No `capture` attribute: leaving it off lets mobile browsers offer
			 * both the camera and the existing photo library, instead of forcing
			 * the camera open directly.
			 */}
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={onPickImages}
			/>

			{ocrHealth.status === "unconfigured" && (
				<p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 lg:col-span-2 dark:bg-slate-800 dark:text-slate-300">
					{MISSING_OCR_URL_MESSAGE}。OCR は使えませんが、手入力で保存できます。
				</p>
			)}

			{canPick && (
				<div className="space-y-4 lg:sticky lg:top-22">
					<button
						type="button"
						onClick={() => pick(false)}
						className={`flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-white text-slate-400 transition active:scale-[0.99] lg:aspect-auto lg:h-[min(36rem,calc(100dvh-16rem))] dark:bg-slate-800 dark:text-slate-500 ${
							dragging
								? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{current?.previewUrl ? (
							<img
								src={current.previewUrl}
								alt="レシート"
								className="h-full w-full object-contain"
							/>
						) : (
							<div className="flex flex-col items-center gap-2 px-6 text-center">
								<span className="text-4xl">📷</span>
								<span className="text-sm font-medium lg:hidden">
									タップして撮影 / 画像を選択
								</span>
								<span className="hidden text-sm font-medium lg:inline">
									レシート画像をここにドロップ
									<br />
									またはクリックして選択（複数可）
								</span>
							</div>
						)}
					</button>

					{current?.previewUrl && (
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => pick(true)}
								disabled={state?.kind === "saving"}
								className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
							>
								撮り直す
							</button>
							<button
								type="button"
								onClick={() => pick(false)}
								className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700"
							>
								画像を追加
							</button>
						</div>
					)}

					{batch && <QueueStrip queue={queue} current={current} />}
				</div>
			)}

			<div
				className={`space-y-4 ${canPick ? "" : "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl"}`}
			>
				<h2 className="hidden text-base font-bold lg:block">内容を確認</h2>

				{batch && (
					<div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
						<span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">
							{progress.position} / {progress.total}
						</span>
						<span className="text-slate-500 dark:text-slate-400">
							まとめて取り込み中
						</span>
					</div>
				)}

				{state?.kind === "queued" && (
					<StatusLine>
						<Spinner /> 解析の順番を待っています…
					</StatusLine>
				)}
				{state?.kind === "analyzing" && (
					<StatusLine>
						<Spinner /> レシートを解析中…
					</StatusLine>
				)}

				{state?.kind === "failed" && (
					<div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
						<p className="min-w-0 flex-1">
							{state.error} 手入力で保存することもできます。
						</p>
						<button
							type="button"
							onClick={retry}
							className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-slate-800 dark:text-red-300"
						>
							再解析
						</button>
					</div>
				)}

				{state?.kind === "review" && state.error && (
					<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
						{state.error}
					</p>
				)}

				{done && (
					<p className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
						<CheckIcon className="h-4 w-4" /> Google Drive に保存しました
					</p>
				)}

				<ReceiptForm form={form} onChange={setField} />

				<div className="flex gap-3">
					<button
						type="button"
						onClick={skip}
						disabled={!current || state?.kind === "saving"}
						aria-label={batch ? "スキップ" : "リセット"}
						title={batch ? "スキップ" : "リセット"}
						className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition active:scale-[0.99] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
					>
						{batch ? (
							<span className="text-xs font-bold">スキップ</span>
						) : (
							<RefreshIcon className="h-5 w-5" />
						)}
					</button>
					<button
						type="button"
						onClick={onSave}
						disabled={busy || !parseReceiptForm(form).ok}
						className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
					>
						{state?.kind === "saving"
							? "保存中…"
							: batch && progress.position < progress.total
								? "保存して次へ"
								: "保存する"}
					</button>
				</div>
			</div>
		</div>
	);
}

function QueueStrip({
	queue,
	current,
}: {
	queue: readonly CaptureItem[];
	current: CaptureItem | undefined;
}) {
	return (
		<ol className="hidden grid-cols-4 gap-2 lg:grid" aria-label="取り込み待ち">
			{queue.map((item, i) => (
				<li
					key={item.id}
					aria-current={item === current || undefined}
					className={`overflow-hidden rounded-lg border bg-white dark:bg-slate-800 ${
						item === current
							? "border-emerald-500 ring-2 ring-emerald-500/30"
							: "border-slate-200 dark:border-slate-700"
					} ${item.state.kind === "saved" || item.state.kind === "skipped" ? "opacity-50" : ""}`}
				>
					<div className="flex aspect-square items-center justify-center bg-slate-100 dark:bg-slate-900">
						{item.previewUrl ? (
							<img
								src={item.previewUrl}
								alt={`${i + 1} 枚目`}
								className="h-full w-full object-cover"
							/>
						) : (
							<span className="text-xs text-slate-400">手入力</span>
						)}
					</div>
					<p
						className={`truncate px-1.5 py-1 text-center text-[11px] font-medium ${
							item.state.kind === "failed"
								? "text-red-600 dark:text-red-400"
								: item.state.kind === "saved"
									? "text-emerald-600 dark:text-emerald-400"
									: "text-slate-500 dark:text-slate-400"
						}`}
					>
						{i + 1}. {STATE_LABEL[item.state.kind]}
					</p>
				</li>
			))}
		</ol>
	);
}

function StatusLine({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
			{children}
		</div>
	);
}

function Spinner() {
	return (
		<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
	);
}
