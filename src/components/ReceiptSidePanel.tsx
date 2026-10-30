import { formatShortDate } from "../lib/month";
import type { Receipt } from "../lib/receipt";
import { formatYen, inputClass } from "../lib/ui";

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-1 border border-gray-400 bg-gray-100 py-0.5 pl-2 text-sm ${onClear ? "pr-1" : "pr-2"}`}
    >
      {label}
      {onClear && (
        <button
          type="button"
          className="cursor-pointer px-1 text-gray-600 hover:text-gray-900"
          aria-label={`${label}の絞り込みを解除`}
          onClick={onClear}
        >
          ×
        </button>
      )}
    </li>
  );
}

export function ReceiptSidePanel({
  receipts,
  periodLabel,
  dateLabel,
  category,
  query,
  onQueryChange,
  onClearDate,
  onClearCategory,
  onOpen,
}: {
  receipts: Receipt[];
  periodLabel: string;
  dateLabel?: string;
  category?: string;
  query: string;
  onQueryChange: (query: string) => void;
  onClearDate: () => void;
  onClearCategory: () => void;
  onOpen: (receipt: Receipt) => void;
}) {
  const total = receipts.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <aside
      className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-3 border border-gray-400 p-4"
      aria-labelledby="receipt-side-panel-title"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="receipt-side-panel-title" className="text-xl font-bold">
          明細
        </h2>
        <p className="text-sm text-gray-600">
          {receipts.length} 件・
          <span className="font-semibold text-gray-900">
            {formatYen(total)}
          </span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="絞り込み条件">
        <FilterChip
          label={dateLabel ?? periodLabel}
          onClear={dateLabel ? onClearDate : undefined}
        />
        {category && <FilterChip label={category} onClear={onClearCategory} />}
      </ul>

      <input
        className={`${inputClass} text-sm`}
        type="search"
        placeholder="店名・メモで検索"
        aria-label="店名・メモで検索"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {receipts.length === 0 ? (
        <p className="text-sm text-gray-600">該当する明細はありません。</p>
      ) : (
        <ul className="-mx-4 overflow-y-auto border-t border-gray-200 px-4">
          {receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="relative -mx-4 flex items-baseline gap-3 border-b border-gray-200 px-4 py-2 text-sm -outline-offset-2 hover:bg-gray-50 has-[button:focus-visible]:outline-2"
            >
              <span className="w-22 shrink-0 text-gray-600 tabular-nums">
                {formatShortDate(receipt.date)}
              </span>
              <span className="min-w-0 flex-1">
                <button
                  type="button"
                  className="block w-full cursor-pointer truncate text-left outline-none after:absolute after:inset-0"
                  onClick={() => onOpen(receipt)}
                >
                  {receipt.storeName}
                </button>
                <span className="block text-xs text-gray-600">
                  {receipt.category}
                  {receipt.memo && `・${receipt.memo}`}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatYen(receipt.totalAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
