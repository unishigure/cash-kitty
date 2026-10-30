import {
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { chartColors } from "../../lib/chart";
import {
  addDays,
  daysBetween,
  daysInMonth,
  formatFullDate,
  shiftMonth,
  type YearMonth,
} from "../../lib/month";
import { quartiles } from "../../lib/stats";
import { formatYen, today } from "../../lib/ui";
import { ChartTooltip, TooltipRow } from "./ChartTooltip";

const gap = 3;
const labelWidth = 24;
const top = 20;
const weekdayLabels = ["", "月", "", "水", "", "金", ""];

type Cell = { date: string; week: number; weekday: number; total: number };

function describe(cell: Cell) {
  return cell.total > 0 ? formatYen(cell.total) : "支出なし";
}

export function DailyHeatmap({
  start,
  end,
  totals,
  selectedMonth,
  selectedDate,
  onSelect,
}: {
  start: YearMonth;
  end: YearMonth;
  totals: Map<string, number>;
  selectedMonth: YearMonth;
  selectedDate?: string;
  onSelect: (date: string) => void;
}) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [activeDate, setActiveDate] = useState<string>();
  const [hovered, setHovered] = useState<{
    cell: Cell;
    x: number;
    y: number;
  }>();

  const firstDate = `${start}-01`;
  const lastDate = `${end}-${daysInMonth(end)}`;
  const todayDate = today();
  const offset = new Date(`${firstDate}T00:00`).getDay();
  const dayCount = daysBetween(firstDate, lastDate) + 1;
  const weeks = Math.ceil((offset + dayCount) / 7);
  const cells: Cell[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = addDays(firstDate, i);
    if (date > todayDate) break;
    cells.push({
      date,
      week: Math.floor((offset + i) / 7),
      weekday: (offset + i) % 7,
      total: totals.get(date) ?? 0,
    });
  }
  const tabStop =
    cells.find((cell) => cell.date === activeDate)?.date ?? cells.at(-1)?.date;

  const cellSize = Math.min(
    Math.max(Math.floor((width - labelWidth) / weeks) - gap, 10),
    16,
  );
  const pitch = cellSize + gap;
  const gridWidth = weeks * pitch;
  const gridHeight = top + 7 * pitch;
  const [q1, q2, q3] = quartiles(cells.map((c) => c.total));
  const colorOf = (total: number) => {
    if (total <= 0) return chartColors.heatEmpty;
    const level = total <= q1 ? 0 : total <= q2 ? 1 : total <= q3 ? 2 : 3;
    return chartColors.heat[level];
  };

  const monthLabels: { month: YearMonth; x: number }[] = [];
  for (let m = start; m <= end; m = shiftMonth(m, 1)) {
    const week = Math.floor((offset + daysBetween(firstDate, `${m}-01`)) / 7);
    const x = week * pitch;
    const previous = monthLabels.at(-1);
    if (!previous || x - previous.x >= 28) monthLabels.push({ month: m, x });
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [gridWidth]);

  function show(cell: Cell, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    setHovered({
      cell,
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top,
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, cell: Cell) {
    const current = daysBetween(firstDate, cell.date);
    const moves: Record<string, number> = {
      ArrowLeft: current - 7,
      ArrowRight: current + 7,
      ArrowUp: current - 1,
      ArrowDown: current + 1,
      Home: 0,
      End: cells.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = cells[Math.min(Math.max(next, 0), cells.length - 1)];
    if (!target) return;
    setActiveDate(target.date);
    scrollerRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${target.date}"]`)
      ?.focus();
  }

  return (
    <div ref={containerRef} className="relative grid min-w-0 gap-2">
      <p id={hintId} className="sr-only">
        矢印キーで日を移動し、Enter でその日を選択します。
      </p>
      <div className="flex min-w-0">
        <div
          className="relative shrink-0 text-[11px] text-gray-600"
          style={{ width: labelWidth, height: gridHeight }}
        >
          {weekdayLabels.map(
            (label, weekday) =>
              label && (
                <span
                  key={label}
                  className="absolute left-0 leading-none"
                  style={{ top: top + weekday * pitch + cellSize / 2 - 5 }}
                >
                  {label}
                </span>
              ),
          )}
        </div>
        <div ref={scrollerRef} className="min-w-0 flex-1 overflow-x-auto">
          {width > 0 && (
            <div
              className="relative"
              style={{ width: gridWidth, height: gridHeight }}
            >
              {monthLabels.map(({ month, x }) => (
                <span
                  key={month}
                  className={`absolute top-0 text-xs leading-none ${
                    month === selectedMonth
                      ? "font-semibold text-gray-900"
                      : "text-gray-600"
                  }`}
                  style={{ left: x }}
                >
                  {Number(month.slice(5))}月
                </span>
              ))}
              {cells.map((cell) => (
                <button
                  key={cell.date}
                  type="button"
                  data-date={cell.date}
                  className={`absolute rounded-xs outline-offset-1 ${cell.total > 0 ? "cursor-pointer" : ""} focus-visible:outline-2 focus-visible:outline-gray-900 ${
                    cell.date === selectedDate
                      ? "ring-2 ring-gray-900"
                      : cell.date === hovered?.cell.date
                        ? "ring-1 ring-gray-900"
                        : ""
                  }`}
                  style={{
                    left: cell.week * pitch,
                    top: top + cell.weekday * pitch,
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: colorOf(cell.total),
                  }}
                  tabIndex={cell.date === tabStop ? 0 : -1}
                  aria-label={`${formatFullDate(cell.date)} ${describe(cell)}`}
                  aria-describedby={hintId}
                  onPointerEnter={(event) => show(cell, event.currentTarget)}
                  onPointerLeave={() => setHovered(undefined)}
                  onFocus={(event) => {
                    setActiveDate(cell.date);
                    show(cell, event.currentTarget);
                  }}
                  onBlur={() => setHovered(undefined)}
                  onKeyDown={(event) => handleKeyDown(event, cell)}
                  aria-pressed={cell.date === selectedDate}
                  aria-disabled={cell.total === 0 || undefined}
                  onClick={() => {
                    if (cell.total > 0) onSelect(cell.date);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-xs text-gray-600">
        少
        {[chartColors.heatEmpty, ...chartColors.heat].map((color) => (
          <span
            key={color}
            className="size-2.5 rounded-xs"
            style={{ backgroundColor: color }}
          />
        ))}
        多
      </div>

      {hovered && (
        <ChartTooltip
          x={hovered.x}
          y={Math.max(hovered.y - 56, 0)}
          containerWidth={width}
        >
          <TooltipRow
            label={formatFullDate(hovered.cell.date)}
            value={describe(hovered.cell)}
          />
        </ChartTooltip>
      )}
    </div>
  );
}
