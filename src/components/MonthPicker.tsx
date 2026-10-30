import { shiftMonth, toYearMonth, type YearMonth } from "@/lib/month";
import { buttonClass, inputClass, today } from "@/lib/ui";

export function MonthPicker({
  month,
  onChange,
  onSelectAll,
}: {
  month: YearMonth | undefined;
  onChange: (month: YearMonth) => void;
  onSelectAll?: () => void;
}) {
  const base = month ?? toYearMonth(today());

  return (
    <div className="flex items-center gap-2">
      <button
        className={buttonClass}
        type="button"
        aria-label="前の月"
        onClick={() => onChange(month ? shiftMonth(base, -1) : base)}
      >
        ‹
      </button>
      <div className="relative min-w-0 flex-1">
        <input
          className={inputClass}
          type="month"
          aria-label={
            onSelectAll ? "表示する月（空にすると全期間）" : "表示する月"
          }
          required={!onSelectAll}
          value={month ?? ""}
          onChange={(event) => {
            if (event.target.value) onChange(toYearMonth(event.target.value));
            else onSelectAll?.();
          }}
        />
        {!month && (
          <span
            className="pointer-events-none absolute inset-y-px left-px flex items-center bg-white pl-2"
            style={{ right: "2.5rem" }}
            aria-hidden="true"
          >
            全期間
          </span>
        )}
      </div>
      {onSelectAll && (
        <button
          className={buttonClass}
          type="button"
          aria-label="月の指定を解除して全期間を表示"
          title="全期間を表示"
          disabled={!month}
          onClick={onSelectAll}
        >
          ×
        </button>
      )}
      <button
        className={buttonClass}
        type="button"
        aria-label="次の月"
        onClick={() => onChange(month ? shiftMonth(base, 1) : base)}
      >
        ›
      </button>
    </div>
  );
}
