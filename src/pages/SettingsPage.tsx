import { DriveSection } from "@/components/settings/DriveSection";
import { FixedCostSection } from "@/components/settings/FixedCostSection";
import { ThemeSection } from "@/components/settings/ThemeSection";

export function SettingsPage() {
  return (
    <>
      <ThemeSection />
      <FixedCostSection />
      <DriveSection />
    </>
  );
}
