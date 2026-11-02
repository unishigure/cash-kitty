import { ChipLabel } from "@/components/ChipLabel";
import { categoryHues } from "@/lib/chart";
import type { Category } from "@/lib/receipt";

export function CategoryChip({
  category,
  size,
}: {
  category: Category;
  size?: "sm" | "md";
}) {
  return (
    <ChipLabel hue={categoryHues[category]} size={size}>
      {category}
    </ChipLabel>
  );
}
