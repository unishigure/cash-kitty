import { useState } from "react";
import type { DayTotal } from "../../lib/analytics";
import { formatYen } from "../../lib/format";

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

export function DailyHeatmap({
	days,
	onShowDay,
}: {
	days: DayTotal[];
	onShowDay: (date: string) => void;
}) {
	const [selected, setSelected] = useState<string | null>(null);
	const first = days[0];
	if (!first) return null;
	const [y = 0, m = 1] = first.date.split("-").map(Number);
	const lead = new Date(y, m - 1, 1).getDay();
	const max = Math.max(...days.map((d) => d.total));
	const picked = days.find((d) => d.date === selected);

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
					const day = Number(d.date.slice(8));
					const isPicked = d.date === selected;
					return (
						<button
							key={d.date}
							type="button"
							onClick={() => setSelected(isPicked ? null : d.date)}
							aria-label={`${m}月${day}日 ${formatYen(d.total)} ${d.count}件`}
							aria-pressed={isPicked}
							className={`aspect-square rounded-md text-xs font-medium tabular-nums ${
								LEVELS[level(d.total, max)]
							} ${isPicked ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-white dark:ring-white dark:ring-offset-slate-800" : ""}`}
						>
							{day}
						</button>
					);
				})}
			</div>
			<div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
				{picked ? (
					<>
						<span className="tabular-nums">
							{m}月{Number(picked.date.slice(8))}日 {formatYen(picked.total)}・
							{picked.count}件
						</span>
						{picked.count > 0 && (
							<button
								type="button"
								onClick={() => onShowDay(picked.date)}
								className="shrink-0 font-medium text-emerald-600 dark:text-emerald-400"
							>
								明細を見る ›
							</button>
						)}
					</>
				) : (
					<span>日付をタップすると金額を表示します</span>
				)}
				<span className="ml-auto flex shrink-0 items-center gap-1">
					少
					{LEVELS.map((cls) => (
						<span key={cls} className={`h-3 w-3 rounded-sm ${cls}`} />
					))}
					多
				</span>
			</div>
		</div>
	);
}
