import type { Category } from "@/lib/receipt";

export const categoryHues = {
  食費: "orange",
  日用品: "cyan",
  衣服: "magenta",
  趣味: "purple",
  交通: "blue",
  交際: "yellow",
  医療: "red",
  住居: "green",
  光熱費: "green",
  通信: "green",
  税金: "gray",
  貯蓄: "gray",
  その他: "gray",
} satisfies Record<Category, string>;

export function categoryColor(
  category: Category,
  part?: "bg" | "border" | "text",
) {
  return `var(--category-${categoryHues[category]}${part ? `-${part}` : ""})`;
}

export const chartColors = {
  series1: "var(--chart-series)",
  series1Muted: "var(--chart-series-muted)",
  heatEmpty: "var(--chart-heat-empty)",
  heat: [
    "var(--chart-heat-1)",
    "var(--chart-heat-2)",
    "var(--chart-heat-3)",
    "var(--chart-heat-4)",
  ],
  grid: "var(--chart-grid)",
  baseline: "var(--chart-baseline)",
  textPrimary: "var(--chart-text)",
  textMuted: "var(--chart-text-muted)",
};

export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1000];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ??
    10 * magnitude;
  const ticks = [];
  for (let value = 0; value < max + step; value += step) ticks.push(value);
  return ticks;
}

export function formatAxisYen(value: number) {
  if (value < 10000) return value.toLocaleString();
  return `${(value / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}万`;
}

export function columnPath(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const r = Math.min(4, width / 2, height);
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + width - r}`,
    `A${r},${r} 0 0 1 ${x + width},${y + r}`,
    `V${y + height}`,
    "Z",
  ].join("");
}
