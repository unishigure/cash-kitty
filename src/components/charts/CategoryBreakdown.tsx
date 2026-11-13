import { type Category, categoryColor } from "@/lib/receipt/category";
import { formatYen } from "@/lib/ui/format";

export function CategoryBreakdown({
  data,
  selected,
  onSelect,
}: {
  data: { category: Category; total: number; count: number }[];
  selected?: Category;
  onSelect?: (category: Category) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const max = data[0]?.total ?? 0;

  if (total === 0) {
    return (
      <p className="text-dns-16N-130 text-solid-gray-600">支出はありません。</p>
    );
  }

  return (
    <table className="text-dns-16N-130 -mx-2 w-[calc(100%+1rem)] border-collapse">
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
            className={`${onSelect ? "has-[button:focus-visible]:focus-ring-inset relative" : ""} ${
              d.category === selected
                ? "bg-key-50 font-bold"
                : onSelect
                  ? "hover:bg-solid-gray-50"
                  : ""
            }`}
          >
            <th className="w-0 py-2 pr-3 pl-2 text-left font-[inherit] whitespace-nowrap">
              {onSelect ? (
                <button
                  type="button"
                  className="cursor-pointer underline-offset-[3px] outline-none after:absolute after:inset-0 hover:underline focus-visible:shadow-none"
                  aria-pressed={d.category === selected}
                  onClick={() => onSelect(d.category)}
                >
                  {d.category}
                </button>
              ) : (
                d.category
              )}
              <span className="text-dns-14N-120 text-solid-gray-600 ml-1 font-normal">
                {d.count}件
              </span>
            </th>
            <td className="py-2" aria-hidden="true">
              <div
                className="h-3 rounded-r"
                style={{
                  width: `${(d.total / max) * 100}%`,
                  minWidth: 2,
                  backgroundColor: categoryColor(d.category),
                }}
              />
            </td>
            <td className="w-0 py-2 pl-3 text-right whitespace-nowrap tabular-nums">
              {formatYen(d.total)}
            </td>
            <td className="text-solid-gray-600 w-0 py-2 pr-2 pl-3 text-right font-normal whitespace-nowrap tabular-nums">
              {((d.total / total) * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
