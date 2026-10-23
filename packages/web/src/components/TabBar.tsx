import { CameraIcon, ChartIcon, SettingsIcon } from "./icons";

export type TabId = "capture" | "stats" | "settings";

const TABS: { id: TabId; label: string; Icon: typeof CameraIcon }[] = [
	{ id: "capture", label: "取り込み", Icon: CameraIcon },
	{ id: "stats", label: "統計", Icon: ChartIcon },
	{ id: "settings", label: "設定", Icon: SettingsIcon },
];

interface TabsProps {
	active: TabId;
	onChange: (tab: TabId) => void;
}

/** Bottom navigation below `lg`. */
export function TabBar({ active, onChange }: TabsProps) {
	return (
		<nav className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
			<div className="flex">
				{TABS.map(({ id, label, Icon }) => {
					const isActive = id === active;
					return (
						<button
							key={id}
							type="button"
							onClick={() => onChange(id)}
							className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
								isActive
									? "text-emerald-600 dark:text-emerald-400"
									: "text-slate-400 dark:text-slate-500"
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

/** Header navigation from `lg` up. */
export function TopTabs({ active, onChange }: TabsProps) {
	return (
		<nav className="hidden self-stretch lg:mr-auto lg:flex lg:gap-6">
			{TABS.map(({ id, label }) => {
				const isActive = id === active;
				return (
					<button
						key={id}
						type="button"
						onClick={() => onChange(id)}
						aria-current={isActive ? "page" : undefined}
						className={`relative px-1 text-sm font-medium transition-colors ${
							isActive
								? "text-emerald-600 dark:text-emerald-400"
								: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
						}`}
					>
						{label}
						{isActive && (
							<span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
						)}
					</button>
				);
			})}
		</nav>
	);
}
