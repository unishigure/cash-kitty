import { CameraIcon, ChartIcon, SettingsIcon } from "./icons";

export type TabId = "capture" | "stats" | "settings";

const TABS: { id: TabId; label: string; Icon: typeof CameraIcon }[] = [
	{ id: "capture", label: "取り込み", Icon: CameraIcon },
	{ id: "stats", label: "統計", Icon: ChartIcon },
	{ id: "settings", label: "設定", Icon: SettingsIcon },
];

export function TabBar({
	active,
	onChange,
}: {
	active: TabId;
	onChange: (tab: TabId) => void;
}) {
	return (
		<nav className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
			<div className="mx-auto flex max-w-lg">
				{TABS.map(({ id, label, Icon }) => {
					const isActive = id === active;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onChange(id)}
							className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
								isActive ? "text-emerald-600" : "text-slate-400"
							}`}
							aria-current={isActive ? "page" : undefined}
						>
							<Icon className={isActive ? "h-6 w-6" : "h-6 w-6"} />
							<span>{label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
