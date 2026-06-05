import { useRef, useState } from "react";
import type { AppSettings } from "../lib/settings";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import { analyzeReceipt } from "../lib/ocr";
import { CATEGORIES } from "../lib/categories";
import { newId } from "../lib/id";
import type { Receipt } from "../lib/types";
import { CheckIcon } from "../components/icons";

type Drive = ReturnType<typeof useGoogleDrive>;

interface FormState {
	storeName: string;
	totalAmount: string;
	date: string;
	category: string;
	memo: string;
	fullText: string;
}

const emptyForm = (): FormState => ({
	storeName: "",
	totalAmount: "",
	date: "",
	category: "",
	memo: "",
	fullText: "",
});

export function CaptureTab({
	settings,
	drive,
	onGoSettings,
}: {
	settings: AppSettings;
	drive: Drive;
	onGoSettings: () => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [analyzing, setAnalyzing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [form, setForm] = useState<FormState>(emptyForm);

	const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setError(null);
		setDone(false);
		setImageFile(file);
		setPreview((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(file);
		});

		setAnalyzing(true);
		try {
			const result = await analyzeReceipt(settings.apiBaseUrl, file);
			setForm((f) => ({
				...f,
				storeName: result.storeName || f.storeName,
				totalAmount:
					result.totalAmount != null
						? String(result.totalAmount)
						: f.totalAmount,
				date: result.date || f.date,
				fullText: result.fullText,
			}));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setAnalyzing(false);
		}
	};

	const reset = () => {
		setImageFile(null);
		setPreview((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
		setForm(emptyForm());
		if (fileRef.current) fileRef.current.value = "";
	};

	const onSave = async () => {
		setError(null);
		const amount = Number(form.totalAmount);
		if (!form.totalAmount.trim()) {
			setError("金額を入力してください。");
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			setError("金額が正しくありません。");
			return;
		}
		if (!form.date) {
			setError("日付を入力してください。");
			return;
		}
		if (!form.category) {
			setError("カテゴリを選択してください。");
			return;
		}
		const now = new Date().toISOString();
		const receipt: Receipt = {
			id: newId(),
			storeName: form.storeName.trim(),
			totalAmount: Math.round(amount),
			date: form.date,
			category: form.category,
			memo: form.memo.trim() || undefined,
			fullText: form.fullText || undefined,
			createdAt: now,
			updatedAt: now,
		};
		setSaving(true);
		try {
			await drive.saveReceipt(receipt, imageFile ?? undefined);
			setDone(true);
			reset();
			window.scrollTo({ top: 0, behavior: "smooth" });
			setTimeout(() => setDone(false), 2500);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
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
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={onPickImage}
			/>

			{/* Capture / preview area */}
			<button
				type="button"
				onClick={() => fileRef.current?.click()}
				className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition active:scale-[0.99]"
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
					className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50"
				>
					撮り直す
				</button>
			)}

			{analyzing && (
				<div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700">
					<Spinner /> レシートを解析中…
				</div>
			)}

			{error && (
				<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</p>
			)}

			{done && (
				<p className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-3 text-sm font-medium text-emerald-700">
					<CheckIcon className="h-4 w-4" /> Google Drive に保存しました
				</p>
			)}

			{/* Edit form */}
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

				<Field label="日付" required>
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
			</div>

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
				className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
			>
				{saving ? "保存中…" : "保存する"}
			</button>
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
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-slate-500">
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
		<div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
			<p className="text-base font-bold text-slate-800">{title}</p>
			<p className="text-sm text-slate-500">{body}</p>
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
