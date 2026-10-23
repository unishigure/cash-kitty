import { categoryColor } from "../lib/categories";
import { formatYen } from "../lib/format";
import type { Receipt } from "../lib/types";
import { ImageIcon } from "./icons";

export function ReceiptRow({
	receipt,
	onOpen,
}: {
	receipt: Receipt;
	onOpen: () => void;
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onOpen}
				className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-700"
			>
				<span
					className="h-9 w-1.5 shrink-0 rounded-full"
					style={{ backgroundColor: categoryColor(receipt.category) }}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
						{receipt.storeName || "（店名なし）"}
					</p>
					<p className="truncate text-xs text-slate-400 dark:text-slate-500">
						{receipt.date} · {receipt.category}
						{receipt.memo ? ` · ${receipt.memo}` : ""}
					</p>
				</div>
				{receipt.imageFileId && (
					<span
						className="shrink-0 text-slate-300 dark:text-slate-500"
						title="画像あり"
					>
						<ImageIcon className="size-4" />
					</span>
				)}
				<span className="shrink-0 tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-100">
					{formatYen(receipt.totalAmount)}
				</span>
				<span className="shrink-0 text-slate-300 dark:text-slate-600">›</span>
			</button>
		</li>
	);
}
