import { useState } from "react";
import "./index.css";
import { TabBar, type TabId } from "./components/TabBar";
import { useGoogleDrive } from "./hooks/useGoogleDrive";
import { useReceiptCapture } from "./hooks/useReceiptCapture";
import { type SettingsApi, useSettings } from "./hooks/useSettings";
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

	// Wait until server config (.env) has loaded so the Drive client mounts with
	// the right client id.
	if (!settingsApi.ready) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
			</div>
		);
	}

	return <AppShell settingsApi={settingsApi} />;
}

function AppShell({ settingsApi }: { settingsApi: SettingsApi }) {
	const { settings } = settingsApi;
	const [tab, setTab] = useState<TabId>("capture");
	const drive = useGoogleDrive(settings.googleClientId);
	// Held at the shell level so an in-flight OCR analysis (and the form it
	// fills) survives switching the bottom-nav tab away and back.
	const capture = useReceiptCapture(settings, drive);

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-slate-50 text-slate-900">
			<header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))]">
				<h1 className="text-lg font-bold tracking-tight">
					<span className="text-emerald-600">Money</span> Note
					<span className="ml-2 text-sm font-normal text-slate-400">
						{TAB_TITLES[tab]}
					</span>
				</h1>
			</header>

			<main className="flex flex-1 flex-col px-4 pb-24 pt-4">
				{tab === "capture" && (
					<CaptureTab
						settings={settings}
						capture={capture}
						onGoSettings={() => setTab("settings")}
					/>
				)}
				{tab === "stats" && <StatsTab drive={drive} />}
				{tab === "settings" && (
					<SettingsTab settings={settings} drive={drive} />
				)}
			</main>

			<TabBar active={tab} onChange={setTab} />
		</div>
	);
}

export default App;
