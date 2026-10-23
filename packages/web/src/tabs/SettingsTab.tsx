import { useEffect, useState } from "react";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import type { ThemeApi } from "../hooks/useTheme";
import { type AppConfig, MISSING_CLIENT_ID_MESSAGE } from "../lib/config";
import { receiptsToCsv } from "../lib/csv";
import { todayIso } from "../lib/format";
import type { Theme } from "../lib/theme";

type Drive = ReturnType<typeof useGoogleDrive>;

type ExportState =
	| { kind: "idle" }
	| { kind: "exporting" }
	| { kind: "done"; count: number }
	| { kind: "error"; message: string };

function downloadText(text: string, filename: string, type: string) {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	// Revoking synchronously can cancel the download in Safari.
	setTimeout(() => URL.revokeObjectURL(url));
}

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STATUS_LABEL: Record<Drive["status"], { text: string; dot: string }> = {
	disconnected: { text: "未接続", dot: "bg-slate-300 dark:bg-slate-600" },
	connecting: { text: "接続中…", dot: "bg-amber-400" },
	connected: { text: "接続済み", dot: "bg-emerald-500" },
	error: { text: "エラー", dot: "bg-red-500" },
};

const THEME_OPTIONS: { value: Theme; label: string }[] = [
	{ value: "light", label: "ライト" },
	{ value: "dark", label: "ダーク" },
	{ value: "system", label: "システム" },
];

export function SettingsTab({
	config,
	drive,
	themeApi,
}: {
	config: AppConfig;
	drive: Drive;
	themeApi: ThemeApi;
}) {
	const status = STATUS_LABEL[drive.status];
	const [installPrompt, setInstallPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isInstalled, setIsInstalled] = useState<boolean>(false);
	const [installMsg, setInstallMsg] = useState<string | null>(null);
	const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });

	useEffect(() => {
		if (typeof window === "undefined") return;

		const checkInstalled = () => {
			const standalone = window.matchMedia(
				"(display-mode: standalone)",
			).matches;
			const safariStandalone = Boolean(
				(navigator as Navigator & { standalone?: boolean }).standalone,
			);
			setIsInstalled(standalone || safariStandalone);
		};

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			setInstallPrompt(event as BeforeInstallPromptEvent);
		};

		const onInstalled = () => {
			setIsInstalled(true);
			setInstallPrompt(null);
			setInstallMsg("アプリをホーム画面に追加しました。");
		};

		checkInstalled();
		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		window.addEventListener("appinstalled", onInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	const onInstall = async () => {
		if (!installPrompt) {
			setInstallMsg(
				"この端末ではブラウザの共有メニューから「ホーム画面に追加」を選択してください。",
			);
			return;
		}

		setInstallMsg(null);
		await installPrompt.prompt();
		const choice = await installPrompt.userChoice;
		if (choice.outcome === "accepted") {
			setInstallMsg("インストールを開始しました。");
		} else {
			setInstallMsg("インストールをキャンセルしました。");
		}
		setInstallPrompt(null);
	};

	const onExport = async () => {
		setExportState({ kind: "exporting" });
		try {
			const receipts = await drive.loadAllReceipts();
			downloadText(
				receiptsToCsv(receipts),
				`cash-kitty-${todayIso()}.csv`,
				"text/csv;charset=utf-8",
			);
			setExportState({ kind: "done", count: receipts.length });
		} catch (e) {
			setExportState({
				kind: "error",
				message: e instanceof Error ? e.message : String(e),
			});
		}
	};

	return (
		<div className="space-y-5">
			{/* Appearance */}
			<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
				<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
					外観
				</h2>
				<div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
					{THEME_OPTIONS.map(({ value, label }) => {
						const active = themeApi.theme === value;
						return (
							<button
								key={value}
								type="button"
								aria-pressed={active}
								onClick={() => themeApi.setTheme(value)}
								className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
									active
										? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
										: "text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
								}`}
							>
								{label}
							</button>
						);
					})}
				</div>
			</section>

			{/* Google Drive connection */}
			<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
						Google Drive
					</h2>
					<span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
						<span className={`h-2 w-2 rounded-full ${status.dot}`} />
						{status.text}
					</span>
				</div>

				<p className="flex flex-col text-xs text-slate-500 px-1 text-center dark:text-slate-400">
					<span>データはあなたの Google Drive の専用領域に保存されます。</span>
					<span>サーバーに保存されることはありません。</span>
				</p>
				<p className="px-1 text-center text-xs text-slate-400 dark:text-slate-500">
					データ保存件数: {drive.totalCount} 件
				</p>
				{!config.googleClientId && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{MISSING_CLIENT_ID_MESSAGE}
					</p>
				)}
				{drive.error && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{drive.error}
					</p>
				)}
				<div className="flex gap-2">
					{drive.status === "connected" ? (
						<button
							type="button"
							onClick={drive.disconnect}
							className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:active:bg-slate-600"
						>
							切断
						</button>
					) : (
						<button
							type="button"
							onClick={() => void drive.connect()}
							disabled={!config.googleClientId || drive.loading}
							className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50"
						>
							{drive.loading ? "接続中…" : "接続する"}
						</button>
					)}
				</div>
			</section>

			<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
				<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
					データのエクスポート
				</h2>
				<p className="text-xs text-center text-slate-500 dark:text-slate-400">
					すべてのレシートを CSV ファイルとしてダウンロードします。
				</p>
				<button
					type="button"
					onClick={() => void onExport()}
					disabled={
						drive.status !== "connected" || exportState.kind === "exporting"
					}
					className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50"
				>
					{exportState.kind === "exporting"
						? "エクスポート中…"
						: "CSV でダウンロード"}
				</button>
				{exportState.kind === "error" && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{exportState.message}
					</p>
				)}
				{exportState.kind === "done" && (
					<p className="text-center text-xs text-slate-500 dark:text-slate-400">
						{exportState.count} 件をエクスポートしました。
					</p>
				)}
			</section>

			{/* PWA install */}
			{!isInstalled && (
				<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
					<h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
						ホーム画面に追加
					</h2>
					<p className="text-xs text-center text-slate-500 dark:text-slate-400">
						ホーム画面に追加して、アプリのように使えます。
					</p>
					<button
						type="button"
						onClick={() => void onInstall()}
						className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white"
					>
						ホーム画面に追加
					</button>
					{installMsg && (
						<p className="text-center text-xs text-slate-500 dark:text-slate-400">
							{installMsg}
						</p>
					)}
				</section>
			)}
		</div>
	);
}
