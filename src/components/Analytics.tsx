import { type ReactNode, useEffect, useState } from "react";
import { cumulativeByDay, totalOfMonth } from "../lib/analytics";
import { chartColors } from "../lib/chart";
import {
  daysInMonth,
  formatMonth,
  shiftMonth,
  toYearMonth,
  type YearMonth,
} from "../lib/month";
import { listReceiptsBetween, type Receipt } from "../lib/receipt";
import { formatError, formatYen, today } from "../lib/ui";
import { CumulativeLineChart } from "./charts/CumulativeLineChart";
import { MonthlyBarChart } from "./charts/MonthlyBarChart";
import { MonthPicker } from "./MonthPicker";

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

function formatOptionalYen(value: number | undefined) {
  return value === undefined ? "—" : formatYen(value);
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border border-gray-400 p-4">
      <h2 className="text-xl font-bold">{title}</h2>
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

  const currentCumulative = cumulativeByDay(list, month, elapsed);
  const previousCumulative = cumulativeByDay(list, previousMonth);
  const lineDays = Math.max(daysInMonth(month), daysInMonth(previousMonth));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">分析</h1>
      <MonthPicker month={month} onChange={setMonth} />
      {error && <p role="alert">{error}</p>}

      {receipts && (
        <div
          className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`}
          aria-busy={loading}
        >
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

          <Section title="月別の支出推移">
            <p className="text-sm text-gray-600">
              {formatMonth(chartStart)}〜{formatMonth(chartEnd)}
              。棒を選ぶとその月に切り替わります。
            </p>
            <MonthlyBarChart
              data={monthlyTotals}
              selected={month}
              onSelect={setMonth}
            />
            <DataTable
              headers={["月", "支出"]}
              rows={monthlyTotals.map((d) => [
                formatMonth(d.month),
                formatYen(d.total),
              ])}
            />
          </Section>

          <Section title="月内の累積支出">
            <CumulativeLineChart
              title="月内の累積支出"
              days={lineDays}
              series={[
                {
                  label: formatMonth(month),
                  color: chartColors.series1,
                  values: currentCumulative,
                },
                {
                  label: formatMonth(previousMonth),
                  color: chartColors.series2,
                  values: previousCumulative,
                },
              ]}
            />
            <DataTable
              headers={["日", formatMonth(month), formatMonth(previousMonth)]}
              rows={Array.from({ length: lineDays }, (_, index) => [
                `${index + 1}日`,
                formatOptionalYen(currentCumulative[index]),
                formatOptionalYen(previousCumulative[index]),
              ])}
            />
          </Section>
        </div>
      )}
    </div>
  );
}
