export const themes = [
  { value: "system", label: "端末の設定" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
] as const;

export type Theme = (typeof themes)[number]["value"];

const themeKey = "cash-kitty-v2.theme";

export function getTheme(): Theme {
  const stored = localStorage.getItem(themeKey);
  return themes.find(({ value }) => value === stored)?.value ?? "system";
}

export function applyTheme(theme = getTheme()) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function setTheme(theme: Theme) {
  if (theme === "system") localStorage.removeItem(themeKey);
  else localStorage.setItem(themeKey, theme);
  applyTheme(theme);
}
