import { useEffect, useState } from "react";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { DailyHeatmap } from "@/components/charts/DailyHeatmap";
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { MonthPicker } from "@/components/MonthPicker";
import { noticeClass } from "@/components/Notice";
import {
  type OpenedReceipt,
  ReceiptDialogs,
} from "@/components/receipt/ReceiptDialogs";
import { ReceiptPanel } from "@/components/receipt/ReceiptPanel";
import { StatsSection } from "@/components/stats/StatsSection";
import { ComparisonTile, StatTile } from "@/components/stats/StatTile";
import { useReceiptsRevision } from "@/hooks/useDrive";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { excludeFixedCosts, useFixedCosts } from "@/lib/fixed-costs";
import {
  daysInMonth,
  formatFullDate,
  formatMonth,
  shiftMonth,
  toYearMonth,
  type YearMonth,
} from "@/lib/month";
import {
  filterReceipts,
  listAllReceipts,
  listReceiptsBetween,
  type Receipt,
  removeReceipt,
  replaceReceipt,
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
  const [allPeriods, setAllPeriods] = useState(false);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revision = useReceiptsRevision();
  const fixedCosts = useFixedCosts();

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
  }, [month, revision]);

  useEffect(() => {
    if (!allPeriods) return;
    let cancelled = false;
    listAllReceipts()
      .then((list) => {
        if (!cancelled) setAllReceipts(list);
      })
      .catch((error: unknown) => {
        if (!cancelled) setError(formatError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [allPeriods, revision]);

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

  function selectCategory(category: string) {
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
      {error && (
        <p role="alert" className={noticeClass.error}>
          <span>{error}</span>
        </p>
      )}

      {receipts && (
        <div
          className={`grid items-start gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_30rem] ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 *:first:col-span-2 sm:*:first:col-span-1">
              <StatTile
                label={
                  allPeriods ? "全期間の支出" : `${formatMonth(month)}の支出`
                }
                value={formatYen(
                  allPeriods
                    ? allList.reduce((sum, r) => sum + r.totalAmount, 0)
                    : thisTotal,
                )}
              >
                {(fixedCosts.exclude || (!allPeriods && isPartialMonth)) && (
                  <p className="text-dns-14N-130 text-solid-gray-600">
                    {[
                      !allPeriods && isPartialMonth && `${elapsed}日まで`,
                      fixedCosts.exclude && "固定費を除く",
                    ]
                      .filter(Boolean)
                      .join("・")}
                  </p>
                )}
              </StatTile>
              <ComparisonTile
                label="前月比"
                current={thisTotal}
                base={allPeriods ? undefined : previousTotal}
              />
              <ComparisonTile
                label="前年同月比"
                current={thisTotal}
                base={allPeriods ? undefined : lastYearTotal}
              />
            </div>

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
        onError={(error) => setError(formatError(error))}
      />
    </div>
  );
}
