import type { ReactNode } from "react";

import type { ChipHue } from "@/lib/receipt/category";

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
      className={`rounded-8 inline-flex shrink-0 items-center border whitespace-nowrap ${
        size === "sm"
          ? "text-oln-14N-100 min-h-6 px-[calc(5/16*1rem)]"
          : "text-oln-16N-100 min-h-8 px-[calc(7/16*1rem)]"
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
