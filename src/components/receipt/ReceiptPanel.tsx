import { useId, useRef } from "react";

import { CategoryChip } from "@/components/receipt/CategoryChip";
import { Icon } from "@/components/ui/Icon";
import type { Category } from "@/lib/receipt/category";
import type { Receipt } from "@/lib/receipt/receipt";
import { sumAmount } from "@/lib/receipt/stats";
import { formatYen } from "@/lib/ui/format";
import { cardClass, inputClass } from "@/lib/ui/styles";

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <li
      className={`border-key-900 bg-key-50 text-dns-14B-120 text-key-1000 flex min-h-8 items-center gap-1 rounded-full border ${onClear ? "pr-1 pl-3" : "px-3"}`}
    >
      {label}
      {onClear && (
        <button
          type="button"
          className="hover:bg-key-200 grid size-6 cursor-pointer place-items-center rounded-full"
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
  category?: Category;
  allPeriods: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onClearDate?: () => void;
  onClearCategory?: () => void;
  onOpen: (receipt: Receipt) => void;
}) {
  const total = sumAmount(receipts);
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
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

      <div className="relative">
        <input
          ref={searchRef}
          name="q"
          className={`${inputClass} pr-12 [&::-webkit-search-cancel-button]:appearance-none`}
          type="search"
          placeholder="店名・メモで検索"
          aria-label="店名・メモで検索"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="text-solid-gray-600 hover:bg-solid-gray-50 hover:text-solid-gray-900 absolute inset-y-0 right-1 my-auto grid size-10 cursor-pointer place-items-center rounded-full"
            aria-label="検索語を消去"
            title="検索語を消去"
            onClick={() => {
              onQueryChange("");
              searchRef.current?.focus();
            }}
          >
            <Icon name="close" className="size-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {receipts.length === 0 ? (
        <p className="text-dns-16N-130 text-solid-gray-600">
          該当する明細はありません。
        </p>
      ) : (
        <ul
          className={`border-solid-gray-420 -mx-4 border-t px-4 md:-mx-6 md:px-6 ${sticky ? "overflow-y-auto" : ""}`}
        >
          {receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="border-solid-gray-200 text-dns-16N-130 hover:bg-solid-gray-50 has-[button:focus-visible]:focus-ring-inset relative -mx-4 flex items-baseline gap-3 border-b px-4 py-3 md:-mx-6 md:px-6"
            >
              <span className="text-dns-14N-130 text-solid-gray-600 w-22 shrink-0 tabular-nums">
                {receipt.date}
              </span>
              <span className="min-w-0 flex-1">
                <button
                  type="button"
                  className="text-solid-gray-900 block w-full cursor-pointer truncate text-left underline-offset-[3px] outline-none after:absolute after:inset-0 hover:underline focus-visible:shadow-none"
                  onClick={() => onOpen(receipt)}
                >
                  {receipt.storeName}
                </button>
                <span className="text-dns-14N-120 text-solid-gray-600 mt-2 flex items-center gap-2">
                  <CategoryChip category={receipt.category} size="sm" />
                  {receipt.memo && (
                    <span className="truncate">{receipt.memo}</span>
                  )}
                </span>
              </span>
              <span className="text-solid-gray-900 shrink-0 font-bold tabular-nums">
                {formatYen(receipt.totalAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Root>
  );
}
