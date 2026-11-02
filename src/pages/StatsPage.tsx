import { useState } from "react";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { DailyHeatmap } from "@/components/charts/DailyHeatmap";
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import {
  type OpenedReceipt,
  ReceiptDialogs,
} from "@/components/receipt/ReceiptDialogs";
import { ReceiptPanel } from "@/components/receipt/ReceiptPanel";
import { StatsSection } from "@/components/stats/StatsSection";
import { SummaryTiles } from "@/components/stats/SummaryTiles";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { Notice } from "@/components/ui/Notice";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useReceiptsRevision } from "@/hooks/useDrive";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Category } from "@/lib/receipt/category";
import { excludeFixedCosts, useFixedCosts } from "@/lib/receipt/fixed-costs";
import {
  filterReceipts,
  listAllReceipts,
  listReceiptsBetween,
  type Receipt,
  removeReceipt,
  replaceReceipt,
} from "@/lib/receipt/receipt";
import {
  categoryTotals,
  dailyTotals,
  sumAmount,
  totalOfMonth,
} from "@/lib/receipt/stats";
import { errorStatus, type Status } from "@/lib/ui/status";
import { sidePanelQuery } from "@/lib/ui/styles";
import {
  daysInMonth,
  formatFullDate,
  formatMonth,
  shiftMonth,
  today,
  toYearMonth,
  type YearMonth,
} from "@/lib/utils/date";
import { receiptsHash } from "@/lib/utils/route";

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
  const [selectedCategory, setSelectedCategory] = useState<Category>();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<OpenedReceipt>();
  const showsSidePanel = useMediaQuery(sidePanelQuery);
  const [receipts, setReceipts] = useState<Receipt[]>();
  const [allPeriods, setAllPeriods] = useState(false);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Status>();
  const revision = useReceiptsRevision();
  const fixedCosts = useFixedCosts();

  useAsyncEffect(
    () => {
      setLoading(true);
      setError(undefined);
      return listReceiptsBetween(
        shiftMonth(month, -12),
        barChartEndMonth(month),
      );
    },
    {
      onLoad: (list) => {
        setReceipts(list);
        setLoading(false);
      },
      onError: (error) => {
        setError(errorStatus(error));
        setLoading(false);
      },
    },
    [month, revision],
  );

  useAsyncEffect(
    () => (allPeriods ? listAllReceipts() : undefined),
    {
      onLoad: setAllReceipts,
      onError: (error) => setError(errorStatus(error)),
    },
    [allPeriods, revision],
  );

  const previousMonth = shiftMonth(month, -1);
  const lastYearMonth = shiftMonth(month, -12);
  const list = excludeFixedCosts(receipts ?? [], fixedCosts);
  const allList = excludeFixedCosts(allReceipts ?? [], fixedCosts);

  const chartEnd = barChartEndMonth(month);
  const chartStart = shiftMonth(chartEnd, -11);
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => {
    const m = shiftMonth(chartStart, index);
    return { month: m, total: totalOfMonth(list, m) };
  });
  const elapsed = elapsedDays(month);
  const isPartialMonth = elapsed > 0 && elapsed < daysInMonth(month);
  const thisTotal = totalOfMonth(list, month);
  const previousTotal = totalOfMonth(list, previousMonth);
  const lastYearTotal = totalOfMonth(list, lastYearMonth);

  const categories = allPeriods
    ? categoryTotals(allList, undefined)
    : categoryTotals(list, month);
  const totalsByDate = dailyTotals(list);
  const filteredReceipts = filterReceipts(allPeriods ? allList : list, {
    month: allPeriods ? undefined : month,
    date: selectedDate,
    category: selectedCategory,
    query,
  });

  function selectMonth(next: YearMonth) {
    setMonth(next);
    setAllPeriods(false);
    setSelectedDate(undefined);
  }

  function selectAllPeriods() {
    setAllPeriods(true);
    setSelectedDate(undefined);
  }

  function selectBar(next: YearMonth) {
    if (!allPeriods && next === month) selectAllPeriods();
    else selectMonth(next);
  }

  function updateLists(update: (list: Receipt[]) => Receipt[]) {
    setReceipts((current) => current && update(current));
    setAllReceipts((current) => current && update(current));
  }

  function selectDate(date: string) {
    if (!showsSidePanel) {
      location.hash = receiptsHash({ month: toYearMonth(date), date });
      return;
    }
    setMonth(toYearMonth(date));
    setSelectedDate((current) => (current !== date ? date : undefined));
  }

  function selectCategory(category: Category) {
    if (!showsSidePanel) {
      location.hash = receiptsHash({ month, all: allPeriods, category });
      return;
    }
    setSelectedCategory((current) =>
      current === category ? undefined : category,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthPicker
        month={allPeriods ? undefined : month}
        onChange={selectMonth}
        onSelectAll={selectAllPeriods}
      />
      {error && <Notice status={error} />}

      {receipts && (
        <div
          className={`grid items-start gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_30rem] ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <SummaryTiles
              label={
                allPeriods ? "全期間の支出" : `${formatMonth(month)}の支出`
              }
              total={allPeriods ? sumAmount(allList) : thisTotal}
              notes={[
                ...(!allPeriods && isPartialMonth ? [`${elapsed}日まで`] : []),
                ...(fixedCosts.exclude ? ["固定費を除く"] : []),
              ]}
              current={thisTotal}
              previousTotal={allPeriods ? undefined : previousTotal}
              lastYearTotal={allPeriods ? undefined : lastYearTotal}
            />

            <StatsSection
              title="月別の支出推移"
              period={`${formatMonth(chartStart)}〜${formatMonth(chartEnd)}`}
            >
              <MonthlyBarChart
                data={monthlyTotals}
                selected={allPeriods ? undefined : month}
                onSelect={selectBar}
              />
            </StatsSection>

            <StatsSection
              title="カテゴリー別の構成"
              period={
                allPeriods
                  ? "全期間"
                  : `${formatMonth(month)}${isPartialMonth ? `（${elapsed}日まで）` : ""}`
              }
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
              allPeriods={allPeriods}
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
        onSaved={(saved) => updateLists((list) => replaceReceipt(list, saved))}
        onDeleted={(deleted) =>
          updateLists((list) => removeReceipt(list, deleted.id))
        }
        onError={(error) => setError(errorStatus(error))}
      />
    </div>
  );
}
