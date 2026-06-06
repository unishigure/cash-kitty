import { useState } from "react";
import "./index.css";
import { TabBar, type TabId } from "./components/TabBar";
import { useGoogleDrive } from "./hooks/useGoogleDrive";
import { useReceiptCapture } from "./hooks/useReceiptCapture";
import { type SettingsApi, useSettings } from "./hooks/useSettings";
import { type ThemeApi, useTheme } from "./hooks/useTheme";
import { currentMonthKey, shiftMonth } from "./lib/format";
import { CaptureTab } from "./tabs/CaptureTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { StatsTab } from "./tabs/StatsTab";

const TAB_TITLES: Record<TabId, string> = {
	capture: "レシート取り込み",
	stats: "統計",
	settings: "設定",
};

export function App() {
	const settingsApi = useSettings();
	const themeApi = useTheme();

	// Wait until server config (.env) has loaded so the Drive client mounts with
	// the right client id.
	if (!settingsApi.ready) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
			</div>
		);
	}

	return <AppShell settingsApi={settingsApi} themeApi={themeApi} />;
}

function AppShell({
	settingsApi,
	themeApi,
}: {
	settingsApi: SettingsApi;
	themeApi: ThemeApi;
}) {
	const { settings } = settingsApi;
	const [tab, setTab] = useState<TabId>("capture");
	const drive = useGoogleDrive(settings.googleClientId);
	// Held at the shell level so an in-flight OCR analysis (and the form it
	// fills) survives switching the bottom-nav tab away and back.
	const capture = useReceiptCapture(settings, drive);

	// Stats month lives here so the header can host a "return to current month"
	// button while StatsTab drives the month with arrows/swipe.
	const [statsMonth, setStatsMonth] = useState<string>(currentMonthKey());
	const [statsDir, setStatsDir] = useState<1 | -1>(1);
	const changeStatsMonth = (delta: 1 | -1) => {
		setStatsDir(delta);
		setStatsMonth((m) => shiftMonth(m, delta));
	};
	const goToCurrentMonth = () => {
		const current = currentMonthKey();
		// Slide in the direction we're traveling in time (keys are "YYYY-MM").
		setStatsDir(statsMonth < current ? 1 : -1);
		setStatsMonth(current);
	};
	const isCurrentMonth = statsMonth === currentMonthKey();

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			<header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-800 dark:bg-slate-900/95">
				<h1 className="text-lg font-bold tracking-tight">
					<span className="text-emerald-600 dark:text-emerald-400">Money</span>{" "}
					Note
					<span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
						{TAB_TITLES[tab]}
					</span>
				</h1>
				{tab === "stats" && !isCurrentMonth && (
					<button
						type="button"
						onClick={goToCurrentMonth}
						className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:active:bg-emerald-900"
					>
						今月に戻る
					</button>
				)}
			</header>

			<main className="flex flex-1 flex-col px-4 pb-24 pt-4">
				{tab === "capture" && (
					<CaptureTab
						settings={settings}
						capture={capture}
						onGoSettings={() => setTab("settings")}
					/>
				)}
				{tab === "stats" && (
					<StatsTab
						drive={drive}
						month={statsMonth}
						direction={statsDir}
						onChangeMonth={changeStatsMonth}
					/>
				)}
				{tab === "settings" && (
					<SettingsTab settings={settings} drive={drive} themeApi={themeApi} />
				)}
			</main>

			<TabBar active={tab} onChange={setTab} />
		</div>
	);
}

export default App;
