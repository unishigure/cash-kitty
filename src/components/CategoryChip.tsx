import { categoryColor } from "@/lib/chart";
import type { Category } from "@/lib/receipt";

// https://design.digital.go.jp/dads/components/chip-label/ の filled-1
export function CategoryChip({
  category,
  size = "md",
}: {
  category: Category;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-8 border whitespace-nowrap ${
        size === "sm"
          ? "min-h-6 px-[calc(5/16*1rem)] text-oln-14N-100"
          : "min-h-8 px-[calc(7/16*1rem)] text-oln-16N-100"
      }`}
      style={{
        backgroundColor: categoryColor(category, "bg"),
        borderColor: categoryColor(category, "border"),
        color: categoryColor(category, "text"),
      }}
    >
      {category}
    </span>
  );
}
