import { chartColors } from "../../lib/chart";
import { formatYen } from "../../lib/ui";

export function CategoryBreakdown({
  data,
  selected,
  onSelect,
}: {
  data: { category: string; total: number; count: number }[];
  selected?: string;
  onSelect?: (category: string) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const max = data[0]?.total ?? 0;

  if (total === 0) {
    return <p className="text-sm text-gray-600">この月の支出はありません。</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sr-only">
        <tr>
          <th>カテゴリー</th>
          <td aria-hidden="true" />
          <th>金額</th>
          <th>構成比</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr
            key={d.category}
            className={d.category === selected ? "bg-blue-50" : undefined}
          >
            <th className="w-0 py-1 pr-3 text-left font-normal whitespace-nowrap">
              {onSelect ? (
                <button
                  type="button"
                  className="cursor-pointer underline-offset-2 hover:underline"
                  aria-pressed={d.category === selected}
                  onClick={() => onSelect(d.category)}
                >
                  {d.category}
                </button>
              ) : (
                d.category
              )}
              <span className="ml-1 text-xs text-gray-600">{d.count}件</span>
            </th>
            <td className="py-1" aria-hidden="true">
              <div
                className="h-3 rounded-r"
                style={{
                  width: `${(d.total / max) * 100}%`,
                  minWidth: 2,
                  backgroundColor: chartColors.series1,
                }}
              />
            </td>
            <td className="w-0 py-1 pl-3 text-right whitespace-nowrap tabular-nums">
              {formatYen(d.total)}
            </td>
            <td className="w-0 py-1 pl-3 text-right whitespace-nowrap text-gray-600 tabular-nums">
              {((d.total / total) * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
