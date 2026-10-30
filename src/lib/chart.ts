export const chartColors = {
  series1: "#2a78d6",
  series1Muted: "#86b6ef",
  heatEmpty: "#ebebe8",
  heat: ["#9ec5f4", "#5598e7", "#256abf", "#104281"],
  surface: "#ffffff",
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
  textPrimary: "#0b0b0b",
  textMuted: "#6b6a66",
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
