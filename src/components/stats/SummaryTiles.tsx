import { ComparisonTile, StatTile } from "@/components/stats/StatTile";
import { formatYen } from "@/lib/ui/format";

export function SummaryTiles({
  label,
  total,
  notes,
  current,
  previousTotal,
  lastYearTotal,
}: {
  label: string;
  total: number;
  notes: string[];
  current: number;
  previousTotal?: number;
  lastYearTotal?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 *:first:col-span-2 sm:grid-cols-3 sm:*:first:col-span-1">
      <StatTile label={label} value={formatYen(total)}>
        {notes.length > 0 && (
          <p className="text-dns-14N-130 text-solid-gray-600">
            {notes.join("・")}
          </p>
        )}
      </StatTile>
      <ComparisonTile label="前月比" current={current} base={previousTotal} />
      <ComparisonTile
        label="前年同月比"
        current={current}
        base={lastYearTotal}
      />
    </div>
  );
}
