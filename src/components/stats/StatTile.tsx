import type { ReactNode } from "react";
import { formatYen } from "@/lib/ui/format";
import { cardClass } from "@/lib/ui/styles";

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
    <div className={`grid content-start gap-1 ${cardClass}`}>
      <p className="text-dns-16N-130 text-solid-gray-700">{label}</p>
      <p className="text-std-24B-150 text-solid-gray-900 tabular-nums">
        {value}
      </p>
      {children}
    </div>
  );
}

export function ComparisonTile({
  label,
  current,
  base,
}: {
  label: string;
  current: number;
  base: number | undefined;
}) {
  if (!base) {
    return (
      <StatTile label={label} value="—">
        <p className="text-dns-14N-130 text-solid-gray-600">
          比較できるデータがありません
        </p>
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
          className={`text-dns-14B-130 ${increased ? "text-error-2" : "text-success-2"}`}
        >
          <span aria-hidden="true">{increased ? "▲" : "▼"} </span>
          {percent}% {increased ? "増" : "減"}
        </p>
      )}
    </StatTile>
  );
}
