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
      className="pointer-events-none absolute z-10 grid gap-0.5 border border-black/10 bg-white px-3 py-2 text-sm shadow-md"
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
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {value}
      </span>
      <span className="whitespace-nowrap text-gray-600">{label}</span>
    </div>
  );
}
