import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { buttonClass, iconButtonClass } from "@/lib/ui/styles";
import { parseDate, today, weekdays } from "@/lib/utils/date";

const minYear = 2000;
const maxYear = new Date().getFullYear() + 1;
const years = Array.from(
  { length: maxYear - minYear + 1 },
  (_, i) => maxYear - i,
);

const dateLabelFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "full" });

function startOfToday() {
  return parseDate(today());
}

function isSameDay(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function clamp(date: Date) {
  if (date.getFullYear() < minYear) return new Date(minYear, 0, 1);
  if (date.getFullYear() > maxYear) return new Date(maxYear, 11, 31);
  return date;
}

function shiftDays(date: Date, days: number) {
  return clamp(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days),
  );
}

function withMonth(date: Date, year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return clamp(new Date(year, month, Math.min(date.getDate(), last)));
}

function weeksOf(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  const cursor = new Date(year, month, 1 - first.getDay());
  while (cursor <= last) {
    weeks.push(
      Array.from({ length: 7 }, () => {
        const date = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
        return date;
      }),
    );
  }
  return weeks;
}

// https://design.digital.go.jp/dads/components/calendar/
export function Calendar({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
}) {
  const [focused, setFocused] = useState(() =>
    clamp(selected ?? startOfToday()),
  );
  const tableRef = useRef<HTMLTableElement>(null);
  const year = focused.getFullYear();
  const month = focused.getMonth();

  function focusTabStop() {
    tableRef.current
      ?.querySelector<HTMLButtonElement>('button[tabindex="0"]')
      ?.focus();
  }

  useEffect(focusTabStop, []);

  function moveFocus(date: Date) {
    setFocused(date);
    requestAnimationFrame(focusTabStop);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const steps: Record<string, () => Date> = {
      ArrowLeft: () => shiftDays(focused, -1),
      ArrowRight: () => shiftDays(focused, 1),
      ArrowUp: () => shiftDays(focused, -7),
      ArrowDown: () => shiftDays(focused, 7),
      PageUp: () => withMonth(focused, year, month - 1),
      PageDown: () => withMonth(focused, year, month + 1),
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    moveFocus(step());
  }

  const hasPrev = year > minYear || month > 0;
  const hasNext = year < maxYear || month < 11;

  return (
    <div className="grid w-max max-w-full">
      <div className="flex gap-2 p-4">
        <Select
          aria-label="年"
          value={year}
          onChange={(event) =>
            setFocused(withMonth(focused, Number(event.target.value), month))
          }
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </Select>
        <div className="flex items-center">
          <button
            className={iconButtonClass}
            type="button"
            aria-label="前の月"
            disabled={!hasPrev}
            onClick={() => setFocused(withMonth(focused, year, month - 1))}
          >
            <Icon name="chevronLeft" className="size-5" />
          </button>
          <p className="text-std-16N-170 w-14 text-center" aria-live="polite">
            {month + 1}月
          </p>
          <button
            className={iconButtonClass}
            type="button"
            aria-label="次の月"
            disabled={!hasNext}
            onClick={() => setFocused(withMonth(focused, year, month + 1))}
          >
            <Icon name="chevronRight" className="size-5" />
          </button>
        </div>
      </div>

      <table
        ref={tableRef}
        className="mx-3 mb-2 border-collapse"
        aria-label={`${year}年${month + 1}月`}
        onKeyDown={handleKeyDown}
      >
        <thead>
          <tr>
            {weekdays.map((weekday) => (
              <th
                key={weekday}
                scope="col"
                className="text-std-16B-170 text-solid-gray-700 size-12 p-0 text-center"
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(year, month).map((week) => (
            <tr key={week[0]?.getTime()}>
              {week.map((date) => {
                const isSelected = !!selected && isSameDay(date, selected);
                return (
                  <td key={date.getTime()} className="p-0">
                    {date.getMonth() === month && (
                      <button
                        className={`text-std-16N-170 m-1 grid size-10 cursor-pointer place-items-center rounded-full tabular-nums underline-offset-[3px] ${
                          isSelected
                            ? "bg-key-900 text-white"
                            : "hover:bg-solid-gray-50 active:bg-solid-gray-100 hover:border hover:border-black hover:underline"
                        }`}
                        type="button"
                        tabIndex={isSameDay(date, focused) ? 0 : -1}
                        aria-label={`${isSelected ? "選択中 " : ""}${dateLabelFormat.format(date)}`}
                        aria-pressed={isSelected}
                        onFocus={() => setFocused(date)}
                        onClick={() => onSelect(date)}
                      >
                        {date.getDate()}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-4 p-4">
        <button
          className="rounded-8 text-oln-16B-100 text-key-900 hover:bg-key-50 min-h-10 cursor-pointer px-3 underline underline-offset-[3px] hover:decoration-[3px]"
          type="button"
          onClick={() => onSelect(undefined)}
        >
          削除
        </button>
        <button
          className={buttonClass}
          type="button"
          onClick={() => onSelect(startOfToday())}
        >
          今日
        </button>
      </div>
    </div>
  );
}
