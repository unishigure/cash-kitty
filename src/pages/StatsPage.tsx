import { useEffect, useState } from "react";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { DailyHeatmap } from "@/components/charts/DailyHeatmap";
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { MonthPicker } from "@/components/MonthPicker";
import {
  type OpenedReceipt,
  ReceiptDialogs,
} from "@/components/receipt/ReceiptDialogs";
import { ReceiptPanel } from "@/components/receipt/ReceiptPanel";
import { StatsSection } from "@/components/stats/StatsSection";
import { ComparisonTile, StatTile } from "@/components/stats/StatTile";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  daysInMonth,
  formatFullDate,
  formatMonth,
  isDateInMonth,
  shiftMonth,
  toYearMonth,
  type YearMonth,
} from "@/lib/month";
import {
  compareReceiptsOldestFirst,
  listReceiptsBetween,
  matchesQuery,
  type Receipt,
} from "@/lib/receipt";
import { receiptsHash } from "@/lib/route";
import { categoryTotals, dailyTotals, totalOfMonth } from "@/lib/stats";
import { formatError, formatYen, sidePanelQuery, today } from "@/lib/ui";

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

export function StatsPage() {
  const [month, setMonth] = useState(() => toYearMonth(today()));
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<OpenedReceipt>();
  const showsSidePanel = useMediaQuery(sidePanelQuery);
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
      (!selectedCategory || r.category === selectedCategory) &&
      (!query.trim() || matchesQuery(r, query.trim())),
  );

  function selectMonth(next: YearMonth) {
    setMonth(next);
    setSelectedDate(undefined);
  }

  function selectDate(date: string) {
    if (!showsSidePanel) {
      location.hash = receiptsHash({ month: toYearMonth(date), date });
      return;
    }
    setMonth(toYearMonth(date));
    setSelectedDate((current) => (current !== date ? date : undefined));
  }

  function selectCategory(category: string) {
    if (!showsSidePanel) {
      location.hash = receiptsHash({ month, category });
      return;
    }
    setSelectedCategory((current) =>
      current === category ? undefined : category,
    );
  }

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

            <StatsSection
              title="月別の支出推移"
              period={`${formatMonth(chartStart)}〜${formatMonth(chartEnd)}`}
            >
              <MonthlyBarChart
                data={monthlyTotals}
                selected={month}
                onSelect={selectMonth}
              />
            </StatsSection>

            <StatsSection
              title="カテゴリー別の構成"
              period={`${formatMonth(month)}${isPartialMonth ? `（${elapsed}日まで）` : ""}`}
            >
              <CategoryBreakdown
                data={categories}
                selected={showsSidePanel ? selectedCategory : undefined}
                onSelect={selectCategory}
              />
            </StatsSection>

            <StatsSection
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
            </StatsSection>
          </div>

          {showsSidePanel && (
            <ReceiptPanel
              sticky
              receipts={filteredReceipts}
              periodLabel={formatMonth(month)}
              dateLabel={selectedDate && formatFullDate(selectedDate)}
              category={selectedCategory}
              query={query}
              onQueryChange={setQuery}
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
