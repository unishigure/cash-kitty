import type { DayTotal } from "../../lib/analytics";
import { formatYen, todayIso } from "../../lib/format";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// One hue, light to dark. Dark mode gets its own steps so "more" stays the
// louder cell against the dark surface instead of an inverted ramp.
const LEVELS = [
	"bg-slate-100 text-slate-400 dark:bg-slate-700/60 dark:text-slate-500",
	"bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
	"bg-emerald-300 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50",
	"bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white",
	"bg-emerald-700 text-white dark:bg-emerald-400 dark:text-slate-950",
];

function level(total: number, max: number): number {
	if (total <= 0 || max <= 0) return 0;
	return Math.min(4, Math.max(1, Math.ceil((total / max) * 4)));
}

/** Days without receipts are disabled: there is nothing to list for them. */
export function DailyHeatmap({
	days,
	selected,
	onSelect,
}: {
	days: DayTotal[];
	selected: string | null;
	onSelect: (date: string) => void;
}) {
	const first = days[0];
	if (!first) return null;
	const [y = 0, m = 1] = first.date.split("-").map(Number);
	const lead = new Date(y, m - 1, 1).getDay();
	const max = Math.max(...days.map((d) => d.total));
	const today = todayIso();

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 dark:text-slate-500">
				{WEEKDAYS.map((w) => (
					<span key={w}>{w}</span>
				))}
				{Array.from({ length: lead }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed leading blanks.
					<span key={`blank-${i}`} />
				))}
				{days.map((d) => {
					const isToday = d.date === today;
					const label = `${m}月${Number(d.date.slice(8))}日 ${formatYen(d.total)} ${d.count}件${isToday ? " 今日" : ""}`;
					const isSelected = d.date === selected;
					return (
						<button
							key={d.date}
							type="button"
							onClick={() => onSelect(d.date)}
							disabled={d.count === 0 && !isSelected}
							aria-label={label}
							aria-pressed={isSelected}
							aria-current={isToday ? "date" : undefined}
							title={label}
							className={`aspect-square rounded-md text-xs font-medium tabular-nums lg:aspect-auto lg:h-9 lg:enabled:hover:brightness-95 ${
								LEVELS[level(d.total, max)]
							} ${isSelected ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-slate-800" : ""}`}
						>
							{isToday ? (
								<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 font-bold text-white dark:bg-white dark:text-slate-900">
									{Number(d.date.slice(8))}
								</span>
							) : (
								Number(d.date.slice(8))
							)}
						</button>
					);
				})}
			</div>
			<div className="flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
				少
				{LEVELS.map((cls) => (
					<span key={cls} className={`h-3 w-3 rounded-sm ${cls}`} />
				))}
				多
			</div>
		</div>
	);
}
