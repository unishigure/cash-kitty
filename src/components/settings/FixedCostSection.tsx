import { CategoryChip } from "@/components/receipt/CategoryChip";
import { Choice, ChoiceFieldset } from "@/components/settings/ChoiceFieldset";
import { HelpPopover } from "@/components/ui/HelpPopover";
import { type Category, categories } from "@/lib/receipt/category";
import { setFixedCategories, useFixedCosts } from "@/lib/receipt/fixed-costs";

export function FixedCostSection() {
  const fixedCosts = useFixedCosts();

  function toggle(category: Category, checked: boolean) {
    setFixedCategories(
      checked
        ? [...fixedCosts.categories, category]
        : fixedCosts.categories.filter((c) => c !== category),
    );
  }

  return (
    <ChoiceFieldset
      legend={
        <>
          固定費
          <HelpPopover id="settings-fixed-cost-help" label="固定費の説明">
            統計画面で「固定費を除く」を選ぶと、
            ここで選んだカテゴリーを支出から除きます。
          </HelpPopover>
        </>
      }
    >
      {categories.map((category) => (
        <Choice
          key={category}
          type="checkbox"
          checked={fixedCosts.categories.includes(category)}
          onChange={(event) => toggle(category, event.target.checked)}
        >
          <CategoryChip category={category} />
        </Choice>
      ))}
    </ChoiceFieldset>
  );
}
