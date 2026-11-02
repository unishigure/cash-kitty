import { ChipLabel } from "@/components/ChipLabel";
import { type Category, categoryHues } from "@/lib/receipt/category";

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
