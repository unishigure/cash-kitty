import { useEffect, useState } from "react";
import { formatShortDate, isDateInMonth, toYearMonth } from "../lib/month";
import {
  compareReceiptsOldestFirst,
  listReceiptsByMonth,
  matchesQuery,
  type Receipt,
} from "../lib/receipt";
import { formatError, formatYen, inputClass, today } from "../lib/ui";
import { MonthPicker } from "./MonthPicker";
import { type OpenedReceipt, ReceiptDialogs } from "./ReceiptDialogs";

export function ReceiptList() {
  const [month, setMonth] = useState(() => toYearMonth(today()));
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [status, setStatus] = useState("");
  const [opened, setOpened] = useState<OpenedReceipt>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReceipts(undefined);
    setStatus("読み込み中…");

    listReceiptsByMonth(month)
      .then((list) => {
        if (cancelled) return;
        setReceipts(list);
        setStatus("");
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(formatError(error));
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  function handleDeleted(receipt: Receipt) {
    setReceipts((list) => list?.filter(({ id }) => id !== receipt.id));
    setStatus(`削除しました: ${receipt.storeName}`);
  }

  function handleSaved(saved: Receipt) {
    setReceipts((list) =>
      list
        ?.filter(({ id }) => id !== saved.id)
        .concat(isDateInMonth(saved.date, month) ? [saved] : [])
        .sort(compareReceiptsOldestFirst),
    );
    setStatus(`更新しました: ${saved.storeName}`);
  }

  const visible = query.trim()
    ? receipts?.filter((receipt) => matchesQuery(receipt, query.trim()))
    : receipts;
  const total = visible?.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0;
  const byCategory = new Map<string, number>();
  for (const receipt of visible ?? []) {
    byCategory.set(
      receipt.category,
      (byCategory.get(receipt.category) ?? 0) + receipt.totalAmount,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker month={month} onChange={setMonth} />
      <input
        className={inputClass}
        type="search"
        placeholder="店名・メモで検索"
        aria-label="店名・メモで検索"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <output className="block" aria-live="polite">
        {status}
      </output>

      {visible && (
        <>
          <section className="grid gap-2 border border-gray-400 p-4">
            <p className="flex items-baseline justify-between">
              <span>合計（{visible.length} 件）</span>
              <span className="text-2xl font-bold tabular-nums">
                {formatYen(total)}
              </span>
            </p>
            {byCategory.size > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {[...byCategory]
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <li key={category}>
                      {category}{" "}
                      <span className="tabular-nums">{formatYen(amount)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {visible.length === 0 ? (
            <p>
              {query.trim()
                ? `「${query.trim()}」に一致する明細はありません。`
                : "この月の明細はありません。"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-left text-sm text-gray-600">
                    <th className="px-2 py-1 font-normal">日付</th>
                    <th className="px-2 py-1 font-normal">店舗名</th>
                    <th className="px-2 py-1 font-normal">カテゴリー</th>
                    <th className="px-2 py-1 text-right font-normal">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="relative border-b border-gray-200 -outline-offset-2 hover:bg-gray-50 has-[button:focus-visible]:outline-2"
                    >
                      <td className="px-2 py-2 whitespace-nowrap">
                        {formatShortDate(receipt.date)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="cursor-pointer text-left outline-none after:absolute after:inset-0"
                          onClick={() => setOpened({ receipt, mode: "detail" })}
                        >
                          {receipt.storeName}
                        </button>
                        {receipt.memo && (
                          <p className="text-sm text-gray-600">
                            {receipt.memo}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {receipt.category}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">
                        {formatYen(receipt.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ReceiptDialogs
        opened={opened}
        onOpenedChange={setOpened}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onError={(error) => setStatus(formatError(error))}
      />
    </div>
  );
}
