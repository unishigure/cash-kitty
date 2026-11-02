// デジタル庁デザインシステムのカラートークン（blue / solid-gray）
export const chartColors = {
  series1: "#264af4",
  series1Muted: "#9db7f9",
  heatEmpty: "#e6e6e6",
  heat: ["#c5d7fb", "#7096f8", "#264af4", "#00118f"],
  surface: "#ffffff",
  grid: "#e6e6e6",
  baseline: "#949494",
  textPrimary: "#1a1a1a",
  textMuted: "#666666",
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
