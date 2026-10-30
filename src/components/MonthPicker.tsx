import { shiftMonth, toYearMonth, type YearMonth } from "@/lib/month";
import { buttonClass, inputClass } from "@/lib/ui";

export function MonthPicker({
  month,
  onChange,
}: {
  month: YearMonth;
  onChange: (month: YearMonth) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        className={buttonClass}
        type="button"
        aria-label="前の月"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ‹
      </button>
      <input
        className={`${inputClass} w-auto`}
        type="month"
        aria-label="表示する月"
        required
        value={month}
        onChange={(event) => {
          if (event.target.value) onChange(toYearMonth(event.target.value));
        }}
      />
      <button
        className={buttonClass}
        type="button"
        aria-label="次の月"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </div>
  );
}
