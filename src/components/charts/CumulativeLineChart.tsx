import { type PointerEvent, useState } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";
import { chartColors, formatAxisYen, niceTicks } from "../../lib/chart";
import { formatYen } from "../../lib/ui";
import { ChartTooltip, TooltipRow } from "./ChartTooltip";

const height = 240;
const margin = { top: 24, right: 16, bottom: 28, left: 48 };

export type LineSeries = {
  label: string;
  color: string;
  values: number[];
};

export function CumulativeLineChart({
  title,
  series,
  days,
}: {
  title: string;
  series: LineSeries[];
  days: number;
}) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hoveredDay, setHoveredDay] = useState<number>();

  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values)));
  const yMax = ticks.at(-1) ?? 1;
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = height - margin.top - margin.bottom;
  const x = (day: number) =>
    margin.left + (innerWidth * (day - 1)) / Math.max(days - 1, 1);
  const y = (value: number) => margin.top + innerHeight * (1 - value / yMax);
  const dayTicks = [1, 5, 10, 15, 20, 25].filter((d) => d < days - 2);
  dayTicks.push(days);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const left = event.currentTarget.getBoundingClientRect().left;
    const ratio = (event.clientX - left - margin.left) / innerWidth;
    const day = Math.round(ratio * (days - 1)) + 1;
    setHoveredDay(Math.min(Math.max(day, 1), days));
  }

  const lead = series[0];
  const leadLastIndex = (lead?.values.length ?? 0) - 1;
  const leadLastValue = lead?.values[leadLastIndex];

  return (
    <div className="grid min-w-0 gap-2">
      <ul className="flex flex-wrap gap-x-4 text-sm text-gray-600">
        {series.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>

      <div
        ref={containerRef}
        className="relative min-w-0"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredDay(undefined)}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block">
            <title>{title}</title>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? chartColors.baseline : chartColors.grid}
                />
                <text
                  x={margin.left - 8}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill={chartColors.textMuted}
                  className="tabular-nums"
                >
                  {formatAxisYen(tick)}
                </text>
              </g>
            ))}

            {dayTicks.map((day) => (
              <text
                key={day}
                x={x(day)}
                y={height - 8}
                textAnchor="middle"
                fontSize={12}
                fill={chartColors.textMuted}
              >
                {day}日
              </text>
            ))}

            {series.map((s) => (
              <path
                key={s.label}
                d={s.values
                  .map((v, i) => `${i ? "L" : "M"}${x(i + 1)},${y(v)}`)
                  .join("")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {lead && leadLastValue !== undefined && (
              <>
                <circle
                  cx={x(leadLastIndex + 1)}
                  cy={y(leadLastValue)}
                  r={4}
                  fill={lead.color}
                  stroke={chartColors.surface}
                  strokeWidth={2}
                />
                <text
                  x={x(leadLastIndex + 1)}
                  y={y(leadLastValue) - 12}
                  textAnchor={leadLastIndex + 1 > days * 0.8 ? "end" : "middle"}
                  fontSize={12}
                  fontWeight={600}
                  fill={chartColors.textPrimary}
                >
                  {formatAxisYen(leadLastValue)}
                </text>
              </>
            )}

            {hoveredDay !== undefined && (
              <g>
                <line
                  x1={x(hoveredDay)}
                  x2={x(hoveredDay)}
                  y1={margin.top}
                  y2={margin.top + innerHeight}
                  stroke={chartColors.baseline}
                />
                {series.map((s) => {
                  const value = s.values[hoveredDay - 1];
                  return (
                    value !== undefined && (
                      <circle
                        key={s.label}
                        cx={x(hoveredDay)}
                        cy={y(value)}
                        r={4}
                        fill={s.color}
                        stroke={chartColors.surface}
                        strokeWidth={2}
                      />
                    )
                  );
                })}
              </g>
            )}
          </svg>
        )}

        <input
          className="sr-only"
          type="range"
          aria-label={`${title}の日付`}
          min={1}
          max={days}
          value={hoveredDay ?? 1}
          onChange={(event) => setHoveredDay(Number(event.target.value))}
          onFocus={() => setHoveredDay(Math.max(leadLastIndex + 1, 1))}
          onBlur={() => setHoveredDay(undefined)}
        />

        {hoveredDay !== undefined && (
          <ChartTooltip x={x(hoveredDay)} y={margin.top} containerWidth={width}>
            <div className="text-gray-600">{hoveredDay}日時点</div>
            {series.map((s) => {
              const value = s.values[hoveredDay - 1];
              return (
                <TooltipRow
                  key={s.label}
                  color={s.color}
                  label={s.label}
                  value={value === undefined ? "—" : formatYen(value)}
                />
              );
            })}
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}
