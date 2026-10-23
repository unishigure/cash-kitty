import { useMemo } from "react";
import type { MonthTotal } from "../../lib/analytics";
import { categoryColor, DEFAULT_CATEGORY } from "../../lib/categories";
import { formatYen, formatYenCompact } from "../../lib/format";

// Past this many named series the category hues stop being tellable apart, so
// the tail folds into その他.
const MAX_SERIES = 5;

const W = 340;
const H = 190;
const PAD = { top: 18, right: 4, bottom: 20, left: 34 };
const GAP = 2;
const RADIUS = 4;

function niceMax(value: number): number {
	if (value <= 0) return 1000;
	const step = 10 ** Math.floor(Math.log10(value));
	for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) {
		if (m * step >= value) return m * step;
	}
	return 10 * step;
}

function roundedTop(x: number, y: number, w: number, h: number): string {
	const r = Math.min(RADIUS, h, w / 2);
	return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function TrendChart({
	months,
	selected,
	onSelect,
}: {
	months: MonthTotal[];
	/** Highlighted month; with none, every column is drawn at full strength. */
	selected?: string;
	onSelect: (month: string) => void;
}) {
	const series = useMemo(() => {
		const totals = new Map<string, number>();
		for (const m of months) {
			for (const [c, v] of Object.entries(m.byCategory)) {
				totals.set(c, (totals.get(c) ?? 0) + v);
			}
		}
		const ranked = [...totals.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([c]) => c);
		const named = ranked
			.filter((c) => c !== DEFAULT_CATEGORY)
			.slice(0, MAX_SERIES);
		const hasRest = ranked.some((c) => !named.includes(c));
		return { named, hasRest };
	}, [months]);

	const keys = series.hasRest
		? [...series.named, DEFAULT_CATEGORY]
		: series.named;
	const amountFor = (m: MonthTotal, key: string) =>
		key === DEFAULT_CATEGORY && series.hasRest
			? Object.entries(m.byCategory)
					.filter(([c]) => !series.named.includes(c))
					.reduce((s, [, v]) => s + v, 0)
			: (m.byCategory[key] ?? 0);

	const max = niceMax(Math.max(...months.map((m) => m.total)));
	const plotW = W - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;
	const slot = plotW / months.length;
	const barW = Math.min(24, slot * 0.62);
	const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
	const selectedMonth = months.find((m) => m.month === selected);
	const legend = selectedMonth
		? keys
				.map((key) => ({ key, value: amountFor(selectedMonth, key) }))
				.filter((s) => s.value > 0)
		: [];

	return (
		<div>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="w-full"
				role="img"
				aria-label="過去12か月のカテゴリ別支出"
			>
				{[0, 0.5, 1].map((t) => (
					<g key={t}>
						<line
							x1={PAD.left}
							x2={W - PAD.right}
							y1={y(max * t)}
							y2={y(max * t)}
							className="stroke-slate-200 dark:stroke-slate-700"
							strokeWidth={1}
						/>
						<text
							x={PAD.left - 4}
							y={y(max * t) + 3}
							textAnchor="end"
							className="fill-slate-400 text-[9px] tabular-nums dark:fill-slate-500"
						>
							{formatYenCompact(max * t)}
						</text>
					</g>
				))}
				{months.map((m, i) => {
					const x = PAD.left + slot * i + (slot - barW) / 2;
					const isSelected = m.month === selected;
					const segments = keys
						.map((key) => ({ key, value: amountFor(m, key) }))
						.filter((s) => s.value > 0);
					let acc = 0;
					return (
						// biome-ignore lint/a11y/useSemanticElements: an SVG group cannot be a <button>; role + keyboard handling make it one.
						<g
							key={m.month}
							role="button"
							tabIndex={0}
							aria-label={`${m.month} ${formatYen(m.total)}`}
							aria-pressed={isSelected}
							onClick={() => onSelect(m.month)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") onSelect(m.month);
							}}
							className="cursor-pointer outline-none"
							opacity={isSelected || selected === undefined ? 1 : 0.45}
						>
							<rect
								x={PAD.left + slot * i}
								y={PAD.top}
								width={slot}
								height={plotH + PAD.bottom}
								fill="transparent"
							/>
							{segments.map((s, j) => {
								const top = y(acc + s.value);
								const bottom = y(acc);
								acc += s.value;
								const h = Math.max(0, bottom - top - (j > 0 ? GAP : 0));
								const isTop = j === segments.length - 1;
								return isTop ? (
									<path
										key={s.key}
										d={roundedTop(x, top, barW, h)}
										fill={categoryColor(s.key)}
									/>
								) : (
									<rect
										key={s.key}
										x={x}
										y={top}
										width={barW}
										height={h}
										fill={categoryColor(s.key)}
									/>
								);
							})}
							<text
								x={x + barW / 2}
								y={H - 6}
								textAnchor="middle"
								className={`text-[9px] ${
									isSelected
										? "fill-slate-700 font-bold dark:fill-slate-200"
										: "fill-slate-400 dark:fill-slate-500"
								}`}
							>
								{Number(m.month.slice(5))}月
							</text>
							{isSelected && m.total > 0 && (
								<text
									x={Math.min(Math.max(x + barW / 2, PAD.left + 16), W - 16)}
									y={y(m.total) - 5}
									textAnchor="middle"
									className="fill-slate-700 text-[10px] font-bold tabular-nums dark:fill-slate-200"
								>
									{formatYenCompact(m.total)}
								</text>
							)}
						</g>
					);
				})}
			</svg>
			{legend.length > 0 && (
				<ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
					{legend.map(({ key, value }) => (
						<li key={key} className="flex items-center gap-1.5">
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-sm"
								style={{ backgroundColor: categoryColor(key) }}
							/>
							<span className="truncate text-slate-600 dark:text-slate-300">
								{key}
							</span>
							<span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">
								{formatYen(value)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
