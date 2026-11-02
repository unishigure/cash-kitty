import { useId } from "react";
import { CategoryChip } from "@/components/CategoryChip";
import { Icon } from "@/components/Icon";
import type { Receipt } from "@/lib/receipt";
import { sumAmount } from "@/lib/stats";
import { cardClass, formatYen, inputClass } from "@/lib/ui";

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <li
      className={`flex min-h-8 items-center gap-1 rounded-full border border-blue-700 bg-blue-50 text-dns-14B-120 text-blue-800 ${onClear ? "pr-1 pl-3" : "px-3"}`}
    >
      {label}
      {onClear && (
        <button
          type="button"
          className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-blue-200"
          aria-label={`${label}の絞り込みを解除`}
          onClick={onClear}
        >
          <Icon name="close" className="size-4" strokeWidth={2.5} />
        </button>
      )}
    </li>
  );
}

export function ReceiptPanel({
  sticky = false,
  receipts,
  periodLabel,
  dateLabel,
  category,
  allPeriods,
  query,
  onQueryChange,
  onClearDate,
  onClearCategory,
  onOpen,
}: {
  sticky?: boolean;
  receipts: Receipt[];
  periodLabel: string;
  dateLabel?: string;
  category?: string;
  allPeriods: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClearDate?: () => void;
  onClearCategory?: () => void;
  onOpen: (receipt: Receipt) => void;
}) {
  const total = sumAmount(receipts);
  const titleId = useId();
  const Root = sticky ? "aside" : "section";

  return (
    <Root
      className={`flex flex-col gap-3 ${cardClass} ${sticky ? "sticky top-20 max-h-[calc(100dvh-6rem)]" : ""}`}
      aria-labelledby={titleId}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titleId} className="text-std-20B-150 text-solid-gray-900">
          明細
        </h2>
        <p className="text-dns-14N-130 text-solid-gray-600">
          {receipts.length} 件・
          <span className="text-dns-16B-130 text-solid-gray-900 tabular-nums">
            {formatYen(total)}
          </span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="絞り込み条件">
        <FilterChip
          label={dateLabel ?? (allPeriods ? "全期間" : periodLabel)}
          onClear={dateLabel ? onClearDate : undefined}
        />
        {category && <FilterChip label={category} onClear={onClearCategory} />}
      </ul>

      <input
        className={inputClass}
        type="search"
        placeholder="店名・メモで検索"
        aria-label="店名・メモで検索"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {receipts.length === 0 ? (
        <p className="text-dns-16N-130 text-solid-gray-600">
          該当する明細はありません。
        </p>
      ) : (
        <ul
          className={`-mx-4 border-t border-solid-gray-420 px-4 md:-mx-6 md:px-6 ${sticky ? "overflow-y-auto" : ""}`}
        >
          {receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="relative -mx-4 flex items-baseline gap-3 border-b border-solid-gray-200 px-4 py-3 text-dns-16N-130 hover:bg-solid-gray-50 has-[button:focus-visible]:focus-ring-inset md:-mx-6 md:px-6"
            >
              <span className="w-22 shrink-0 text-dns-14N-130 text-solid-gray-600 tabular-nums">
                {receipt.date}
              </span>
              <span className="min-w-0 flex-1">
                <button
                  type="button"
                  className="block w-full cursor-pointer truncate text-left text-solid-gray-900 underline-offset-[3px] outline-none after:absolute after:inset-0 hover:underline focus-visible:shadow-none"
                  onClick={() => onOpen(receipt)}
                >
                  {receipt.storeName}
                </button>
                <span className="mt-2 flex items-center gap-2 text-dns-14N-120 text-solid-gray-600">
                  <CategoryChip category={receipt.category} size="sm" />
                  {receipt.memo && (
                    <span className="truncate">{receipt.memo}</span>
                  )}
                </span>
              </span>
              <span className="shrink-0 font-bold text-solid-gray-900 tabular-nums">
                {formatYen(receipt.totalAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Root>
  );
}
