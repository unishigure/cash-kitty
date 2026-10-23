import { type ReactNode, useEffect, useState } from "react";
import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import type { ThemeApi } from "../hooks/useTheme";
import { CATEGORIES, categoryColor } from "../lib/categories";
import { type AppConfig, MISSING_CLIENT_ID_MESSAGE } from "../lib/config";
import { receiptsToCsv } from "../lib/csv";
import { todayIso } from "../lib/format";
import { parsePreferences } from "../lib/preferences";
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

const PRIMARY_BUTTON =
	"w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50 lg:w-auto lg:px-4";

const HELP_PLACEMENT = {
	center: "lg:min-w-0 lg:flex-1",
	end: "lg:min-w-0 lg:flex-1 lg:text-right",
	below: "lg:order-1 lg:basis-full lg:text-left",
} as const;

/**
 * A settings card. On mobile everything stacks in DOM order. From lg up the
 * title, status, help, meta and action share one header row (help fills the
 * slack between title and action), then help when `helpPlacement` is "below",
 * then every other child on full-width rows.
 * `children` sit above the action on mobile, `footer` below it.
 */
function SettingsSection({
	title,
	status,
	help,
	helpPlacement = "center",
	meta,
	action,
	children,
	footer,
}: {
	title: string;
	status?: ReactNode;
	help?: ReactNode;
	helpPlacement?: keyof typeof HELP_PLACEMENT;
	meta?: ReactNode;
	action?: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;
}) {
	const heading = (
		<h2
			data-row
			className="text-sm font-bold text-slate-700 lg:shrink-0 dark:text-slate-200"
		>
			{title}
		</h2>
	);
	return (
		<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:space-y-0 lg:[&>:not([data-row])]:order-2 lg:[&>:not([data-row])]:basis-full dark:border-slate-700 dark:bg-slate-800">
			{status ? (
				<div data-row className="flex items-center justify-between lg:contents">
					{heading}
					{status}
				</div>
			) : (
				heading
			)}
			{help && (
				<p
					data-row
					className={`text-center text-xs text-slate-500 dark:text-slate-400 ${HELP_PLACEMENT[helpPlacement]}`}
				>
					{help}
				</p>
			)}
			{meta && (
				<p
					data-row
					className="text-center text-xs text-slate-400 lg:shrink-0 dark:text-slate-500"
				>
					{meta}
				</p>
			)}
			{children}
			{action && (
				<div data-row className="lg:ml-auto lg:shrink-0">
					{action}
				</div>
			)}
			{footer}
		</section>
	);
}

function FixedCostsSection({ drive }: { drive: Drive }) {
	const [error, setError] = useState<string | null>(null);
	const fixed = drive.preferences.fixedCategories;
	const connected = drive.status === "connected";

	const toggle = (category: string) => {
		const next = fixed.includes(category)
			? fixed.filter((c) => c !== category)
			: [...fixed, category];
		setError(null);
		drive
			.updatePreferences(parsePreferences({ fixedCategories: next }))
			.catch((e: unknown) =>
				setError(e instanceof Error ? e.message : String(e)),
			);
	};

	return (
		<SettingsSection
			title="固定費"
			help="選んだカテゴリは、分析の「固定費を除く」で集計から外せます。"
			helpPlacement="end"
		>
			<div className="flex flex-wrap gap-2 lg:justify-center">
				{CATEGORIES.map((c) => {
					const on = fixed.includes(c);
					return (
						<button
							key={c}
							type="button"
							aria-pressed={on}
							disabled={!connected}
							onClick={() => toggle(c)}
							className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
								on
									? "bg-emerald-600 text-white"
									: "bg-slate-100 text-slate-600 active:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:active:bg-slate-600"
							}`}
						>
							<span
								className="h-2 w-2 rounded-full ring-1 ring-white/70"
								style={{ backgroundColor: categoryColor(c) }}
							/>
							{c}
						</button>
					);
				})}
			</div>
			{!connected && (
				<p className="text-center text-xs text-slate-400 lg:text-left dark:text-slate-500">
					Google Drive に接続すると変更できます。
				</p>
			)}
			{error && (
				<p className="text-xs text-red-600 dark:text-red-400">{error}</p>
			)}
		</SettingsSection>
	);
}

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
			const receipts = await drive.sync();
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
			<SettingsSection
				title="外観"
				action={
					<div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
						{THEME_OPTIONS.map(({ value, label }) => {
							const active = themeApi.theme === value;
							return (
								<button
									key={value}
									type="button"
									aria-pressed={active}
									onClick={() => themeApi.setTheme(value)}
									className={`flex-1 rounded-lg py-2 text-sm font-medium transition lg:flex-none lg:px-4 lg:py-1.5 ${
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
				}
			/>

			<SettingsSection
				title="Google Drive"
				status={
					<span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 lg:shrink-0 dark:text-slate-400">
						<span className={`h-2 w-2 rounded-full ${status.dot}`} />
						{status.text}
					</span>
				}
				help={
					<>
						<span className="block lg:inline">
							データはあなたの Google Drive の専用領域に保存されます。
						</span>
						<span className="block lg:inline">
							サーバーに保存されることはありません。
						</span>
					</>
				}
				helpPlacement="below"
				meta={`データ保存件数: ${drive.receipts.length} 件`}
				action={
					drive.status === "connected" ? (
						<button
							type="button"
							onClick={drive.disconnect}
							className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50 lg:w-auto lg:px-4 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:active:bg-slate-600"
						>
							切断
						</button>
					) : (
						<button
							type="button"
							onClick={() => void drive.connect()}
							disabled={!config.googleClientId || drive.status === "connecting"}
							className={PRIMARY_BUTTON}
						>
							{drive.status === "connecting" ? "接続中…" : "接続する"}
						</button>
					)
				}
			>
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
			</SettingsSection>

			<FixedCostsSection drive={drive} />

			<SettingsSection
				title="データのエクスポート"
				help="すべてのレシートを CSV ファイルとしてダウンロードします。"
				action={
					<button
						type="button"
						onClick={() => void onExport()}
						disabled={
							drive.status !== "connected" || exportState.kind === "exporting"
						}
						className={PRIMARY_BUTTON}
					>
						{exportState.kind === "exporting"
							? "エクスポート中…"
							: "CSV でダウンロード"}
					</button>
				}
				footer={
					<>
						{exportState.kind === "error" && (
							<p className="text-xs text-red-600 dark:text-red-400">
								{exportState.message}
							</p>
						)}
						{exportState.kind === "done" && (
							<p className="text-center text-xs text-slate-500 lg:text-left dark:text-slate-400">
								{exportState.count} 件をエクスポートしました。
							</p>
						)}
					</>
				}
			/>

			{!isInstalled && (
				<SettingsSection
					title="ホーム画面に追加"
					help="ホーム画面に追加して、アプリのように使えます。"
					action={
						<button
							type="button"
							onClick={() => void onInstall()}
							className={PRIMARY_BUTTON}
						>
							ホーム画面に追加
						</button>
					}
					footer={
						installMsg && (
							<p className="text-center text-xs text-slate-500 lg:text-left dark:text-slate-400">
								{installMsg}
							</p>
						)
					}
				/>
			)}
		</div>
	);
}
