import { useReducer, useState } from "react";
import "./index.css";
import { RefreshIcon } from "./components/icons";
import { TabBar, type TabId, TopTabs } from "./components/TabBar";
import { useGoogleDrive } from "./hooks/useGoogleDrive";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { useOcrHealth } from "./hooks/useOcrHealth";
import { useReceiptCapture } from "./hooks/useReceiptCapture";
import { useTheme } from "./hooks/useTheme";
import { BUILD_CONFIG } from "./lib/config";
import { currentMonthKey } from "./lib/format";
import {
	initialStats,
	type ListFilters,
	type StatsView,
	statsReducer,
} from "./lib/statsFilters";
import { CaptureTab } from "./tabs/CaptureTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { StatsTab } from "./tabs/StatsTab";

const TAB_TITLES: Record<TabId, string> = {
	capture: "レシート取り込み",
	stats: "統計",
	settings: "設定",
};

export function App() {
	const themeApi = useTheme();
	const [tab, setTab] = useState<TabId>("stats");
	const drive = useGoogleDrive(BUILD_CONFIG.googleClientId);
	// Held at the shell level so an in-flight OCR analysis (and the form it
	// fills) survives switching the bottom-nav tab away and back.
	const capture = useReceiptCapture(BUILD_CONFIG.apiBaseUrl, drive);
	// Lifted so the header can host the "connecting" indicator while CaptureTab
	// still uses the status to gate image capture.
	const ocrHealth = useOcrHealth(BUILD_CONFIG.apiBaseUrl);
	const desktop = useIsDesktop();

	// Stats state lives here so it survives tab switches and the header can
	// host a "return to current month" button while StatsTab drives the month.
	const [statsView, setStatsView] = useState<StatsView>("list");
	const [stats, dispatchStats] = useReducer(
		statsReducer,
		currentMonthKey(),
		initialStats,
	);
	const {
		month: statsMonth,
		direction: statsDir,
		filters: statsFilters,
	} = stats;
	const [excludeFixed, setExcludeFixed] = useState(false);
	const changeStatsMonth = (delta: 1 | -1) =>
		dispatchStats({ type: "shiftMonth", delta });
	const selectStatsMonth = (month: string) =>
		dispatchStats({ type: "selectMonth", month });
	const setStatsFilters = (filters: ListFilters) =>
		dispatchStats({ type: "setFilters", filters });
	const showsStatsMonth =
		(statsView === "analysis" && !desktop) ||
		statsFilters.period.kind === "month";
	const isCurrentMonth = statsMonth === currentMonthKey();

	return (
		<div className="flex min-h-dvh w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			<header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
				<div className="flex items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:mx-auto lg:h-14 lg:max-w-340 lg:gap-8 lg:px-6 lg:py-0">
					<h1 className="text-lg font-bold tracking-tight">
						<span className="text-emerald-600 dark:text-emerald-400">Cash</span>{" "}
						Kitty
						<span className="ml-2 text-sm font-normal text-slate-400 lg:hidden dark:text-slate-500">
							{TAB_TITLES[tab]}
						</span>
					</h1>
					<TopTabs active={tab} onChange={setTab} />
					{tab === "stats" && showsStatsMonth && !isCurrentMonth && (
						<button
							type="button"
							onClick={() => selectStatsMonth(currentMonthKey())}
							className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:active:bg-emerald-900"
						>
							今月に戻る
						</button>
					)}
					{tab === "capture" && ocrHealth.status === "checking" && (
						<span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
							<span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent dark:border-slate-600 dark:border-t-transparent" />
							接続中…
						</span>
					)}
					{tab === "capture" && ocrHealth.status === "unconfigured" && (
						<span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
							OCR 未設定
						</span>
					)}
					{tab === "capture" && ocrHealth.status === "offline" && (
						<div className="flex shrink-0 items-center gap-2">
							<span className="text-xs font-medium text-slate-400 dark:text-slate-500">
								取込不可
							</span>
							<button
								type="button"
								onClick={ocrHealth.recheck}
								aria-label="再試行"
								title="再試行"
								className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-500 active:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:active:bg-slate-800"
							>
								<RefreshIcon className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>
			</header>

			<main
				className={`mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-4 lg:pb-8 ${
					tab === "stats"
						? "lg:max-w-340 lg:px-6 lg:pt-5"
						: tab === "capture"
							? "lg:max-w-275 lg:px-6 lg:pt-8"
							: "lg:max-w-2xl lg:pt-8"
				}`}
			>
				{tab === "capture" && (
					<CaptureTab
						config={BUILD_CONFIG}
						capture={capture}
						ocrHealth={ocrHealth}
					/>
				)}
				{tab === "stats" && (
					<StatsTab
						drive={drive}
						view={statsView}
						onChangeView={setStatsView}
						month={statsMonth}
						direction={statsDir}
						onChangeMonth={changeStatsMonth}
						onSelectMonth={selectStatsMonth}
						filters={statsFilters}
						onChangeFilters={setStatsFilters}
						excludeFixed={excludeFixed}
						onChangeExcludeFixed={setExcludeFixed}
						desktop={desktop}
					/>
				)}
				{tab === "settings" && (
					<SettingsTab
						config={BUILD_CONFIG}
						drive={drive}
						themeApi={themeApi}
					/>
				)}
			</main>

			<TabBar active={tab} onChange={setTab} />
		</div>
	);
}

export default App;
