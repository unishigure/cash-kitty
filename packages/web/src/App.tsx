import { useState } from "react";
import "./index.css";
import { RefreshIcon } from "./components/icons";
import { TabBar, type TabId } from "./components/TabBar";
import { useGoogleDrive } from "./hooks/useGoogleDrive";
import { useOcrHealth } from "./hooks/useOcrHealth";
import { useReceiptCapture } from "./hooks/useReceiptCapture";
import { useTheme } from "./hooks/useTheme";
import { BUILD_CONFIG } from "./lib/config";
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
	const themeApi = useTheme();
	const [tab, setTab] = useState<TabId>("stats");
	const drive = useGoogleDrive(BUILD_CONFIG.googleClientId);
	// Held at the shell level so an in-flight OCR analysis (and the form it
	// fills) survives switching the bottom-nav tab away and back.
	const capture = useReceiptCapture(BUILD_CONFIG.apiBaseUrl, drive);
	// Lifted so the header can host the "connecting" indicator while CaptureTab
	// still uses the status to gate image capture.
	const ocrHealth = useOcrHealth(BUILD_CONFIG.apiBaseUrl);

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
		<div className="flex min-h-dvh w-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			<header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
				<div className="flex items-center justify-between gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
					<h1 className="text-lg font-bold tracking-tight">
						<span className="text-emerald-600 dark:text-emerald-400">Cash</span>{" "}
						Kitty
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

			<main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-24 pt-4">
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
						month={statsMonth}
						direction={statsDir}
						onChangeMonth={changeStatsMonth}
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
