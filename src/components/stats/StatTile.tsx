import type { ReactNode } from "react";
import { formatMonth, type YearMonth } from "@/lib/month";
import { formatYen } from "@/lib/ui";

export function StatTile({
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

export function ComparisonTile({
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
