import { Icon } from "@/components/Icon";
import { shiftMonth, today, toYearMonth, type YearMonth } from "@/lib/date";
import { iconButtonClass, inputClass } from "@/lib/ui";

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
        className={iconButtonClass}
        type="button"
        aria-label="前の月"
        onClick={() => onChange(month ? shiftMonth(base, -1) : base)}
      >
        <Icon name="chevronLeft" className="size-5" strokeWidth={2.5} />
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
            className="pointer-events-none absolute inset-y-px left-px flex items-center rounded-l-8 bg-white pl-4"
            style={{ right: "2.5rem" }}
            aria-hidden="true"
          >
            全期間
          </span>
        )}
      </div>
      {onSelectAll &&
        (month ? (
          <button
            className={iconButtonClass}
            type="button"
            aria-label="月の指定を解除して全期間を表示"
            title="全期間を表示"
            onClick={onSelectAll}
          >
            <Icon name="close" className="size-5" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            className={iconButtonClass}
            type="button"
            aria-label="今月を表示"
            title="今月を表示"
            onClick={() => onChange(base)}
          >
            <Icon name="reset" className="size-5" strokeWidth={2.5} />
          </button>
        ))}
      <button
        className={iconButtonClass}
        type="button"
        aria-label="次の月"
        onClick={() => onChange(month ? shiftMonth(base, 1) : base)}
      >
        <Icon name="chevronRight" className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
