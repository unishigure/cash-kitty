import { useEffect, useState } from "react";
import { MonthPicker } from "@/components/MonthPicker";
import {
  type OpenedReceipt,
  ReceiptDialogs,
} from "@/components/receipt/ReceiptDialogs";
import { ReceiptPanel } from "@/components/receipt/ReceiptPanel";
import {
  formatFullDate,
  formatMonth,
  isDateInMonth,
  toYearMonth,
  type YearMonth,
} from "@/lib/month";
import {
  compareReceiptsOldestFirst,
  listAllReceipts,
  listReceiptsByMonth,
  matchesQuery,
  type Receipt,
} from "@/lib/receipt";
import { parseReceiptFilter, receiptsHash } from "@/lib/route";
import { formatError, today } from "@/lib/ui";

export function ReceiptsPage() {
  const [initialFilter] = useState(() => parseReceiptFilter(location.hash));
  const [month, setMonth] = useState(
    () => initialFilter.month ?? toYearMonth(today()),
  );
  const [allPeriods, setAllPeriods] = useState(initialFilter.all ?? false);
  const [date, setDate] = useState(initialFilter.date);
  const [category, setCategory] = useState(initialFilter.category);
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [status, setStatus] = useState("");
  const [opened, setOpened] = useState<OpenedReceipt>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("読み込み中…");

    (allPeriods ? listAllReceipts() : listReceiptsByMonth(month))
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
  }, [month, allPeriods]);

  useEffect(() => {
    history.replaceState(
      null,
      "",
      receiptsHash({ month, all: allPeriods, date, category }),
    );
  }, [month, allPeriods, date, category]);

  function selectMonth(next: YearMonth) {
    setMonth(next);
    setAllPeriods(false);
    setDate(undefined);
  }

  function handleDeleted(receipt: Receipt) {
    setReceipts((list) => list?.filter(({ id }) => id !== receipt.id));
    setStatus(`削除しました: ${receipt.storeName}`);
  }

  function handleSaved(saved: Receipt) {
    setReceipts((list) =>
      list
        ?.filter(({ id }) => id !== saved.id)
        .concat(allPeriods || isDateInMonth(saved.date, month) ? [saved] : [])
        .sort(compareReceiptsOldestFirst),
    );
    setStatus(`更新しました: ${saved.storeName}`);
  }

  const visible = receipts?.filter(
    (receipt) =>
      (!date || receipt.date === date) &&
      (!category || receipt.category === category) &&
      (!query.trim() || matchesQuery(receipt, query.trim())),
  );

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker
        month={allPeriods ? undefined : month}
        onChange={selectMonth}
        onSelectAll={() => {
          setAllPeriods(true);
          setDate(undefined);
        }}
      />

      <output className="block" aria-live="polite">
        {status}
      </output>

      {visible && (
        <ReceiptPanel
          receipts={visible}
          periodLabel={formatMonth(month)}
          dateLabel={date && formatFullDate(date)}
          category={category}
          allPeriods={allPeriods}
          onClearDate={() => setDate(undefined)}
          onClearCategory={() => setCategory(undefined)}
          query={query}
          onQueryChange={setQuery}
          onOpen={(receipt) => setOpened({ receipt, mode: "detail" })}
        />
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
