import { useState } from "react";
import { Choice, ChoiceFieldset } from "@/components/settings/ChoiceFieldset";
import { getTheme, setTheme, type Theme, themes } from "@/lib/ui/theme";

export function ThemeSection() {
  const [theme, setThemeState] = useState(getTheme);

  function select(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <ChoiceFieldset legend="テーマ">
      {themes.map(({ value, label }) => (
        <Choice
          key={value}
          type="radio"
          name="theme"
          checked={theme === value}
          onChange={() => select(value)}
        >
          {label}
        </Choice>
      ))}
    </ChoiceFieldset>
  );
}
