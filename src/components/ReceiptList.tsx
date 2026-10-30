import { useEffect, useState } from "react";
import { isDateInMonth, toYearMonth } from "../lib/month";
import {
  compareReceiptsNewestFirst,
  deleteReceipt,
  listReceiptsByMonth,
  type Receipt,
} from "../lib/receipt";
import { formatError, formatYen, today } from "../lib/ui";
import { MonthPicker } from "./MonthPicker";
import { ReceiptEditDialog } from "./ReceiptEditDialog";

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  const weekday = "日月火水木金土"[new Date(`${date}T00:00`).getDay()];
  return `${Number(month)}/${Number(day)}（${weekday}）`;
}

export function ReceiptList() {
  const [month, setMonth] = useState(() => toYearMonth(today()));
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Receipt>();

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

  async function handleDelete(receipt: Receipt) {
    if (
      !confirm(
        `${formatDate(receipt.date)} ${receipt.storeName} ${formatYen(receipt.totalAmount)} を削除しますか？`,
      )
    ) {
      return;
    }
    try {
      await deleteReceipt(receipt.id);
      setReceipts((list) => list?.filter(({ id }) => id !== receipt.id));
      setStatus(`削除しました: ${receipt.storeName}`);
    } catch (error) {
      setStatus(formatError(error));
    }
  }

  function handleSaved(saved: Receipt) {
    setEditing(undefined);
    setReceipts((list) =>
      list
        ?.filter(({ id }) => id !== saved.id)
        .concat(isDateInMonth(saved.date, month) ? [saved] : [])
        .sort(compareReceiptsNewestFirst),
    );
    setStatus(`更新しました: ${saved.storeName}`);
  }

  const total = receipts?.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0;
  const byCategory = new Map<string, number>();
  for (const receipt of receipts ?? []) {
    byCategory.set(
      receipt.category,
      (byCategory.get(receipt.category) ?? 0) + receipt.totalAmount,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker month={month} onChange={setMonth} />

      <output className="block" aria-live="polite">
        {status}
      </output>

      {receipts && (
        <>
          <section className="grid gap-2 border border-gray-400 p-4">
            <p className="flex items-baseline justify-between">
              <span>合計（{receipts.length} 件）</span>
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

          {receipts.length === 0 ? (
            <p>この月の明細はありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-400 text-left text-sm text-gray-600">
                    <th className="px-2 py-1 font-normal">日付</th>
                    <th className="px-2 py-1 font-normal">店舗名</th>
                    <th className="px-2 py-1 font-normal">カテゴリー</th>
                    <th className="px-2 py-1 text-right font-normal">金額</th>
                    <th className="px-2 py-1">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b border-gray-200">
                      <td className="px-2 py-2 whitespace-nowrap">
                        {formatDate(receipt.date)}
                      </td>
                      <td className="px-2 py-2">
                        {receipt.storeName}
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
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <button
                          className="mr-3 cursor-pointer text-sm text-gray-600 underline hover:text-gray-900"
                          type="button"
                          onClick={() => setEditing(receipt)}
                        >
                          編集
                        </button>
                        <button
                          className="cursor-pointer text-sm text-gray-600 underline hover:text-red-700"
                          type="button"
                          onClick={() => void handleDelete(receipt)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && (
        <ReceiptEditDialog
          receipt={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
