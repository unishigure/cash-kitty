import { useState } from "react";
import { ChartTooltip, TooltipRow } from "@/components/charts/ChartTooltip";
import { useElementWidth } from "@/hooks/useElementWidth";
import {
  chartColors,
  columnPath,
  formatAxisYen,
  niceTicks,
} from "@/lib/ui/chart";
import { formatYen } from "@/lib/ui/format";
import {
  formatMonth,
  formatShortMonth,
  type YearMonth,
} from "@/lib/utils/date";

const height = 240;
const margin = { top: 28, right: 8, bottom: 28, left: 48 };

export function MonthlyBarChart({
  data,
  selected,
  onSelect,
}: {
  data: { month: YearMonth; total: number }[];
  selected: YearMonth | undefined;
  onSelect: (month: YearMonth) => void;
}) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number>();

  const ticks = niceTicks(Math.max(...data.map((d) => d.total)));
  const yMax = ticks.at(-1) ?? 1;
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = height - margin.top - margin.bottom;
  const band = data.length ? innerWidth / data.length : 0;
  const barWidth = Math.min(24, band * 0.6);
  const labelEvery = band < 32 ? 2 : 1;
  const y = (value: number) => margin.top + innerHeight * (1 - value / yMax);
  const centerX = (index: number) => margin.left + band * (index + 0.5);
  const hoveredDatum = hovered === undefined ? undefined : data[hovered];

  return (
    <div ref={containerRef} className="relative min-w-0">
      {width > 0 && (
        <svg width={width} height={height} className="block">
          <title>月別の支出推移</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
                style={{
                  stroke: tick === 0 ? chartColors.baseline : chartColors.grid,
                }}
              />
              <text
                x={margin.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                style={{ fill: chartColors.textMuted }}
                className="tabular-nums"
              >
                {formatAxisYen(tick)}
              </text>
            </g>
          ))}

          {data.map((datum, index) => {
            const x = centerX(index);
            const barHeight = (datum.total / yMax) * innerHeight;
            const isSelected = datum.month === selected;
            const isHovered = index === hovered;
            return (
              <g key={datum.month}>
                {barHeight > 0 && (
                  <path
                    d={columnPath(
                      x - barWidth / 2,
                      y(datum.total),
                      barWidth,
                      barHeight,
                    )}
                    style={{
                      fill: isSelected
                        ? chartColors.series1
                        : chartColors.series1Muted,
                    }}
                    opacity={isHovered ? 0.8 : 1}
                  />
                )}
                {isSelected && (
                  <text
                    x={x}
                    y={y(datum.total) - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    style={{ fill: chartColors.textPrimary }}
                  >
                    {formatAxisYen(datum.total)}
                  </text>
                )}
                {index % labelEvery === (data.length - 1) % labelEvery && (
                  <text
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isSelected ? 600 : 400}
                    style={{
                      fill: isSelected
                        ? chartColors.textPrimary
                        : chartColors.textMuted,
                    }}
                  >
                    {formatShortMonth(datum.month)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {data.map((datum, index) => (
        <button
          key={datum.month}
          type="button"
          className="absolute cursor-pointer rounded-4"
          style={{
            left: centerX(index) - band / 2,
            top: margin.top,
            width: band,
            height: innerHeight,
          }}
          aria-label={`${formatMonth(datum.month)} ${formatYen(datum.total)}`}
          aria-pressed={datum.month === selected}
          onPointerEnter={() => setHovered(index)}
          onPointerLeave={() => setHovered(undefined)}
          onFocus={() => setHovered(index)}
          onBlur={() => setHovered(undefined)}
          onClick={() => onSelect(datum.month)}
        />
      ))}

      {hovered !== undefined && hoveredDatum && (
        <ChartTooltip
          x={centerX(hovered)}
          y={Math.max(y(hoveredDatum.total) - 64, 0)}
          containerWidth={width}
        >
          <TooltipRow
            label={formatMonth(hoveredDatum.month)}
            value={formatYen(hoveredDatum.total)}
          />
        </ChartTooltip>
      )}
    </div>
  );
}
