import type { useGoogleDrive } from "../hooks/useGoogleDrive";
import type { AppSettings } from "../lib/settings";

type Drive = ReturnType<typeof useGoogleDrive>;

const STATUS_LABEL: Record<Drive["status"], { text: string; dot: string }> = {
	disconnected: { text: "未接続", dot: "bg-slate-300" },
	connecting: { text: "接続中…", dot: "bg-amber-400" },
	connected: { text: "接続済み", dot: "bg-emerald-500" },
	error: { text: "エラー", dot: "bg-red-500" },
};

export function SettingsTab({
	settings,
	drive,
}: {
	settings: AppSettings;
	drive: Drive;
}) {
	const status = STATUS_LABEL[drive.status];

	return (
		<div className="space-y-5">
			{/* Google Drive connection */}
			<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold text-slate-700">Google Drive</h2>
					<span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
						<span className={`h-2 w-2 rounded-full ${status.dot}`} />
						{status.text}
					</span>
				</div>

				<p className="text-xs text-slate-500 px-1 text-center">
					<span>データはあなたの Google Drive の専用領域に保存されます。</span>
					<br />
					<span>他のアプリや Google Drive の通常画面からは見えません。</span>
				</p>
				<p className="px-1 text-center text-xs text-slate-400">
					データ保存件数: {drive.receipts.length} 件
				</p>
				{drive.error && <p className="text-xs text-red-600">{drive.error}</p>}
				<div className="flex gap-2">
					{drive.status === "connected" ? (
						<button
							type="button"
							onClick={drive.disconnect}
							className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-600 active:bg-slate-50"
						>
							切断
						</button>
					) : (
						<button
							type="button"
							onClick={() => void drive.connect()}
							disabled={!settings.googleClientId || drive.loading}
							className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50"
						>
							{drive.loading ? "接続中…" : "接続する"}
						</button>
					)}
				</div>
			</section>
		</div>
	);
}
