import { useEffect, useState } from "react";
import {
  type OpenedReceipt,
  ReceiptDialogs,
} from "@/components/receipt/ReceiptDialogs";
import { ReceiptPanel } from "@/components/receipt/ReceiptPanel";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { Notice } from "@/components/ui/Notice";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useReceiptsRevision } from "@/hooks/useDrive";
import {
  filterReceipts,
  listAllReceipts,
  listReceiptsByMonth,
  type Receipt,
  removeReceipt,
  replaceReceipt,
} from "@/lib/receipt/receipt";
import { errorStatus, type Status } from "@/lib/ui/status";
import {
  formatFullDate,
  formatMonth,
  isDateInMonth,
  today,
  toYearMonth,
  type YearMonth,
} from "@/lib/utils/date";
import { parseReceiptFilter, receiptsHash } from "@/lib/utils/route";

export function ReceiptsPage() {
  const [initialFilter] = useState(() => parseReceiptFilter(location.hash));
  const [month, setMonth] = useState(
    () => initialFilter.month ?? toYearMonth(today()),
  );
  const [allPeriods, setAllPeriods] = useState(initialFilter.all ?? false);
  const [date, setDate] = useState(initialFilter.date);
  const [category, setCategory] = useState(initialFilter.category);
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [status, setStatus] = useState<Status>();
  const [opened, setOpened] = useState<OpenedReceipt>();
  const [query, setQuery] = useState("");
  const revision = useReceiptsRevision();

  useAsyncEffect(
    () => {
      setStatus({ tone: "neutral", text: "読み込み中…" });
      return allPeriods ? listAllReceipts() : listReceiptsByMonth(month);
    },
    {
      onLoad: (list) => {
        setReceipts(list);
        setStatus(undefined);
      },
      onError: (error) => setStatus(errorStatus(error)),
    },
    [month, allPeriods, revision],
  );

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
    setReceipts((list) => list && removeReceipt(list, receipt.id));
    setStatus({ tone: "success", text: `削除しました: ${receipt.storeName}` });
  }

  function handleSaved(saved: Receipt) {
    const stillVisible = allPeriods || isDateInMonth(saved.date, month);
    setReceipts(
      (list) =>
        list &&
        (stillVisible
          ? replaceReceipt(list, saved)
          : removeReceipt(list, saved.id)),
    );
    setStatus({ tone: "success", text: `更新しました: ${saved.storeName}` });
  }

  const visible =
    receipts && filterReceipts(receipts, { date, category, query });

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

      <Notice status={status} />

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
        onError={(error) => setStatus(errorStatus(error))}
      />
    </div>
  );
}
