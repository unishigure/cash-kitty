export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	label,
	size = "md",
}: {
	options: readonly { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
	label: string;
	size?: "sm" | "md";
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"
		>
			{options.map((o) => {
				const active = o.value === value;
				return (
					// biome-ignore lint/a11y/useSemanticElements: a button styled as a segment reads better than a radio input here.
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => onChange(o.value)}
						className={`flex-1 rounded-lg font-medium transition ${
							size === "sm" ? "py-1 text-sm" : "py-1.5 text-sm"
						} ${
							active
								? "bg-white text-emerald-700 shadow-sm dark:bg-slate-600 dark:text-emerald-300"
								: "text-slate-500 active:bg-slate-300/60 dark:text-slate-400 dark:active:bg-slate-700"
						}`}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}
