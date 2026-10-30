import { type ReactNode, useEffect, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { categoryTotals, dailyTotals, totalOfMonth } from "../lib/analytics";
import {
  daysInMonth,
  formatFullDate,
  formatMonth,
  isDateInMonth,
  shiftMonth,
  toYearMonth,
  type YearMonth,
} from "../lib/month";
import {
  compareReceiptsOldestFirst,
  listReceiptsBetween,
  type Receipt,
} from "../lib/receipt";
import { formatError, formatYen, today } from "../lib/ui";
import { CategoryBreakdown } from "./charts/CategoryBreakdown";
import { DailyHeatmap } from "./charts/DailyHeatmap";
import { MonthlyBarChart } from "./charts/MonthlyBarChart";
import { MonthPicker } from "./MonthPicker";
import { type OpenedReceipt, ReceiptDialogs } from "./ReceiptDialogs";
import { ReceiptSidePanel } from "./ReceiptSidePanel";

function elapsedDays(month: YearMonth) {
  const todayDate = today();
  const currentMonth = toYearMonth(todayDate);
  if (month < currentMonth) return daysInMonth(month);
  if (month > currentMonth) return 0;
  return Number(todayDate.slice(8, 10));
}

function barChartEndMonth(month: YearMonth) {
  const currentMonth = toYearMonth(today());
  const isInLatestYear =
    month <= currentMonth && month > shiftMonth(currentMonth, -12);
  return isInLatestYear ? currentMonth : month;
}

function ComparisonTile({
  label,
  baseMonth,
  baseUptoDay,
  current,
  base,
}: {
  label: string;
  baseMonth: YearMonth;
  baseUptoDay?: number;
  current: number;
  base: number;
}) {
  const baseLabel = `${formatMonth(baseMonth)}${baseUptoDay ? `（${baseUptoDay}日まで）` : ""}: ${formatYen(base)}`;
  if (base === 0) {
    return (
      <StatTile label={label} value="—">
        <p className="text-sm text-gray-600">比較できるデータがありません</p>
      </StatTile>
    );
  }
  const diff = current - base;
  const increased = diff > 0;
  const percent = Math.abs((diff / base) * 100).toFixed(1);
  return (
    <StatTile
      label={label}
      value={
        diff === 0
          ? "±¥0"
          : `${increased ? "+" : "−"}${formatYen(Math.abs(diff))}`
      }
    >
      {diff !== 0 && (
        <p
          className={`text-sm ${increased ? "text-red-700" : "text-green-800"}`}
        >
          <span aria-hidden="true">{increased ? "▲" : "▼"} </span>
          {percent}% {increased ? "増" : "減"}
        </p>
      )}
      <p className="text-sm text-gray-600">{baseLabel}</p>
    </StatTile>
  );
}

function StatTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1 border border-gray-400 p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {children}
    </div>
  );
}

function Section({
  title,
  period,
  children,
}: {
  title: string;
  period?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border border-gray-400 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {period && <p className="text-sm text-gray-600">{period}</p>}
      </div>
      {children}
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-gray-600">表で見る</summary>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-400 text-left text-gray-600">
            {headers.map((header, index) => (
              <th
                key={header}
                className={`px-2 py-1 font-normal ${index > 0 ? "text-right" : ""}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([head, ...cells]) => (
            <tr key={head} className="border-b border-gray-200">
              <td className="px-2 py-1">{head}</td>
              {cells.map((cell, index) => (
                <td
                  key={headers[index + 1]}
                  className="px-2 py-1 text-right tabular-nums"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Analytics() {
  const [month, setMonth] = useState(() => toYearMonth(today()));
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [opened, setOpened] = useState<OpenedReceipt>();
  const showsSidePanel = useMediaQuery("(min-width: 1024px)");
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    listReceiptsBetween(shiftMonth(month, -12), barChartEndMonth(month))
      .then((list) => {
        if (!cancelled) setReceipts(list);
      })
      .catch((error: unknown) => {
        if (!cancelled) setError(formatError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const previousMonth = shiftMonth(month, -1);
  const lastYearMonth = shiftMonth(month, -12);
  const list = receipts ?? [];

  const chartEnd = barChartEndMonth(month);
  const chartStart = shiftMonth(chartEnd, -11);
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => {
    const m = shiftMonth(chartStart, index);
    return { month: m, total: totalOfMonth(list, m) };
  });
  const elapsed = elapsedDays(month);
  const isPartialMonth = elapsed > 0 && elapsed < daysInMonth(month);
  const compareUptoDay = isPartialMonth ? elapsed : undefined;
  const thisTotal = totalOfMonth(list, month);
  const previousTotal = totalOfMonth(list, previousMonth, compareUptoDay);
  const lastYearTotal = totalOfMonth(list, lastYearMonth, compareUptoDay);

  const categories = categoryTotals(list, month);
  const totalsByDate = dailyTotals(list);
  const filteredReceipts = list.filter(
    (r) =>
      isDateInMonth(r.date, month) &&
      (!selectedDate || r.date === selectedDate) &&
      (!selectedCategory || r.category === selectedCategory),
  );

  function selectMonth(next: YearMonth) {
    setMonth(next);
    setSelectedDate(undefined);
  }

  function selectDate(date: string) {
    setMonth(toYearMonth(date));
    setSelectedDate((current) =>
      showsSidePanel && current !== date ? date : undefined,
    );
  }

  function selectCategory(category: string) {
    setSelectedCategory((current) =>
      current === category ? undefined : category,
    );
  }

  const spendingDays = [...totalsByDate]
    .filter(([date]) => date >= `${chartStart}-01`)
    .sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker month={month} onChange={selectMonth} />
      {error && <p role="alert">{error}</p>}

      {receipts && (
        <div
          className={`grid items-start gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_22rem] ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label={`${formatMonth(month)}の支出`}
                value={formatYen(thisTotal)}
              >
                {isPartialMonth && (
                  <p className="text-sm text-gray-600">{elapsed}日までの集計</p>
                )}
              </StatTile>
              <ComparisonTile
                label="前月比"
                baseMonth={previousMonth}
                baseUptoDay={compareUptoDay}
                current={thisTotal}
                base={previousTotal}
              />
              <ComparisonTile
                label="前年同月比"
                baseMonth={lastYearMonth}
                baseUptoDay={compareUptoDay}
                current={thisTotal}
                base={lastYearTotal}
              />
            </div>

            <Section
              title="月別の支出推移"
              period={`${formatMonth(chartStart)}〜${formatMonth(chartEnd)}`}
            >
              <MonthlyBarChart
                data={monthlyTotals}
                selected={month}
                onSelect={selectMonth}
              />
              <DataTable
                headers={["月", "支出"]}
                rows={monthlyTotals.map((d) => [
                  formatMonth(d.month),
                  formatYen(d.total),
                ])}
              />
            </Section>

            <Section
              title="カテゴリー別の構成"
              period={`${formatMonth(month)}${isPartialMonth ? `（${elapsed}日まで）` : ""}`}
            >
              <CategoryBreakdown
                data={categories}
                selected={showsSidePanel ? selectedCategory : undefined}
                onSelect={showsSidePanel ? selectCategory : undefined}
              />
            </Section>

            <Section
              title="日ごとの支出"
              period={`${formatMonth(chartStart)}〜${formatMonth(chartEnd)}`}
            >
              <DailyHeatmap
                start={chartStart}
                end={chartEnd}
                totals={totalsByDate}
                selectedMonth={month}
                selectedDate={selectedDate}
                onSelect={selectDate}
              />
              <DataTable
                headers={["日付", "支出"]}
                rows={spendingDays.map(([date, total]) => [
                  formatFullDate(date),
                  formatYen(total),
                ])}
              />
            </Section>
          </div>

          {showsSidePanel && (
            <ReceiptSidePanel
              receipts={filteredReceipts}
              periodLabel={formatMonth(month)}
              dateLabel={selectedDate && formatFullDate(selectedDate)}
              category={selectedCategory}
              onClearDate={() => setSelectedDate(undefined)}
              onClearCategory={() => setSelectedCategory(undefined)}
              onOpen={(receipt) => setOpened({ receipt, mode: "detail" })}
            />
          )}
        </div>
      )}

      <ReceiptDialogs
        opened={opened}
        onOpenedChange={setOpened}
        onSaved={(saved) =>
          setReceipts((current) =>
            current
              ?.map((r) => (r.id === saved.id ? saved : r))
              .sort(compareReceiptsOldestFirst),
          )
        }
        onDeleted={(deleted) =>
          setReceipts((current) => current?.filter((r) => r.id !== deleted.id))
        }
        onError={(error) => setError(formatError(error))}
      />
    </div>
  );
}
