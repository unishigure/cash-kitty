import { Switch } from "@/components/Switch";
import { setExcludeFixed, useFixedCosts } from "@/lib/receipt/fixed-costs";

export function FixedCostToggle() {
  const { exclude } = useFixedCosts();

  return (
    <Switch label="固定費を除く" checked={exclude} onChange={setExcludeFixed} />
  );
}
