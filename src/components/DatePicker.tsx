import { useId, useRef, useState } from "react";
import { Calendar } from "@/components/Calendar";
import { Icon } from "@/components/Icon";
import { iconButtonClass } from "@/lib/ui";

type Parts = { year: string; month: string; day: string };

function split(value: string): Parts {
  const [year = "", month = "", day = ""] = value ? value.split("-") : [];
  return {
    year,
    month: month.replace(/^0/, ""),
    day: day.replace(/^0/, ""),
  };
}

function compose({ year, month, day }: Parts) {
  if (!/^\d{4}$/.test(year) || !month || !day) return "";
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function toDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day);
}

const fields = [
  { key: "year", label: "年", width: "w-16", maxLength: 4 },
  { key: "month", label: "月", width: "w-11", maxLength: 2 },
  { key: "day", label: "日", width: "w-11", maxLength: 2 },
] as const;

// https://design.digital.go.jp/dads/components/date-picker/ の統合型
export function DatePicker({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [parts, setParts] = useState(() => split(value));
  const [prevValue, setPrevValue] = useState(value);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== compose(parts)) setParts(split(value));
  }

  const selected = compose(parts);
  const invalid =
    parts.year.length === 4 && !!parts.month && !!parts.day && !selected;

  function update(next: Parts) {
    const composed = compose(next);
    setParts(next);
    setPrevValue(composed);
    onChange(composed);
  }

  function pick(date: Date | undefined) {
    update(
      date
        ? {
            year: String(date.getFullYear()),
            month: String(date.getMonth() + 1),
            day: String(date.getDate()),
          }
        : { year: "", month: "", day: "" },
    );
    popoverRef.current?.hidePopover();
  }

  return (
    <div className="flex w-fit items-center gap-4 [anchor-name:--date-picker]">
      <div
        className={`flex h-12 w-fit rounded-8 border bg-white p-0.5 pr-4 hover:border-solid-gray-900 focus-within:border-black has-disabled:border-solid-gray-300 has-disabled:bg-solid-gray-50 has-disabled:text-solid-gray-420 ${invalid ? "border-error-1" : "border-solid-gray-600"}`}
      >
        {fields.map(({ key, label, width, maxLength }) => (
          <label key={key} className="flex items-center">
            <input
              className={`h-full ${width} rounded-8 border border-transparent bg-transparent pr-3 text-right text-std-16N-170 tabular-nums focus:border-solid-gray-600 disabled:cursor-not-allowed`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={maxLength}
              autoComplete="off"
              required={required}
              aria-invalid={invalid || undefined}
              value={parts[key]}
              onChange={(event) =>
                update({
                  ...parts,
                  [key]: event.target.value.replace(/\D/g, ""),
                })
              }
            />
            <span className="px-1 text-std-16N-170">{label}</span>
          </label>
        ))}
      </div>
      <button
        className={iconButtonClass}
        type="button"
        aria-label="カレンダーから選択"
        aria-haspopup="dialog"
        aria-expanded={open}
        popoverTarget={popoverId}
      >
        <Icon name="calendar" />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        role="dialog"
        aria-label="カレンダー"
        className="m-0 mt-2 max-w-[calc(100vw-1rem)] overflow-x-auto rounded-8 border border-solid-gray-420 bg-white p-0 text-solid-gray-800 shadow-1 inset-auto [position-anchor:--date-picker] [position-area:bottom_span-right] [position-try-fallbacks:bottom,flip-block,top]"
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        {open && <Calendar selected={toDate(selected)} onSelect={pick} />}
      </div>
    </div>
  );
}
