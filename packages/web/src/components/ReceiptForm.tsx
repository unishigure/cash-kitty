import type { ReactNode } from "react";
import { CATEGORIES } from "../lib/categories";
import type { ReceiptFormState } from "../lib/receiptForm";

export function ReceiptForm({
	form,
	onChange,
	children,
}: {
	form: ReceiptFormState;
	onChange: <K extends keyof ReceiptFormState>(
		key: K,
		value: ReceiptFormState[K],
	) => void;
	children?: ReactNode;
}) {
	return (
		<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
			<Field label="店名">
				<input
					type="text"
					value={form.storeName}
					onChange={(e) => onChange("storeName", e.target.value)}
					placeholder="例: スーパーマーケット"
					className="input placeholder:text-slate-300"
				/>
			</Field>

			<Field label="金額 (円)" required>
				<input
					type="number"
					inputMode="numeric"
					value={form.totalAmount}
					onChange={(e) => onChange("totalAmount", e.target.value)}
					placeholder="0"
					className="input"
				/>
			</Field>

			<Field label="日付" required>
				<input
					type="date"
					value={form.date}
					onChange={(e) => onChange("date", e.target.value)}
					className="input min-w-0 appearance-none"
				/>
			</Field>

			<div className="block">
				<FieldLabel label="カテゴリ" required />
				<div className="flex flex-wrap gap-2">
					{CATEGORIES.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => onChange("category", c)}
							aria-pressed={form.category === c}
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
					onChange={(e) => onChange("memo", e.target.value)}
					placeholder="任意"
					className="input placeholder:text-slate-300"
				/>
			</Field>

			{children}
		</div>
	);
}

function FieldLabel({
	label,
	required,
}: {
	label: string;
	required?: boolean;
}) {
	return (
		<span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
			{label}
			{required && <span className="ml-0.5 text-red-500">*</span>}
		</span>
	);
}

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the form control is supplied via `children`.
		<label className="block">
			<FieldLabel label={label} required={required} />
			{children}
		</label>
	);
}
