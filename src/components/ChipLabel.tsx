import type { ReactNode } from "react";
import type { ChipHue } from "@/lib/category";

// https://design.digital.go.jp/dads/components/chip-label/ の filled-1
export function ChipLabel({
  hue,
  size = "md",
  children,
}: {
  hue: ChipHue;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-8 border whitespace-nowrap ${
        size === "sm"
          ? "min-h-6 px-[calc(5/16*1rem)] text-oln-14N-100"
          : "min-h-8 px-[calc(7/16*1rem)] text-oln-16N-100"
      }`}
      style={{
        backgroundColor: `var(--category-${hue}-bg)`,
        borderColor: `var(--category-${hue}-border)`,
        color: `var(--category-${hue}-text)`,
      }}
    >
      {children}
    </span>
  );
}
