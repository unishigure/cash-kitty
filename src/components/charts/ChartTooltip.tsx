import type { ReactNode } from "react";

const tooltipWidth = 232;

export function ChartTooltip({
  x,
  y,
  containerWidth,
  children,
}: {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}) {
  const left = Math.min(
    Math.max(x - tooltipWidth / 2, 0),
    containerWidth - tooltipWidth,
  );
  return (
    <div
      className="pointer-events-none absolute z-10 grid gap-0.5 rounded-8 border border-solid-gray-420 bg-white px-3 py-2 text-dns-14N-130 shadow-2"
      style={{ left, top: y, width: tooltipWidth }}
    >
      {children}
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {color && (
        <span
          className="h-0.5 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="font-bold whitespace-nowrap text-solid-gray-900 tabular-nums">
        {value}
      </span>
      <span className="whitespace-nowrap text-solid-gray-600">{label}</span>
    </div>
  );
}
