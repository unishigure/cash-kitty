/** Default expense categories (Japanese). */
export const CATEGORIES = [
	"食費",
	"外食",
	"日用品",
	"交通",
	"娯楽",
	"医療",
	"衣服",
	"住居費",
	"光熱費",
	"通信",
	"税金",
	"貯蓄",
	"その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "その他";

/** A stable color per category for charts / chips. */
export const CATEGORY_COLORS: Record<string, string> = {
	食費: "#f97316",
	外食: "#ef4444",
	日用品: "#22c55e",
	交通: "#3b82f6",
	娯楽: "#a855f7",
	医療: "#14b8a6",
	衣服: "#ec4899",
	住居費: "#0f766e",
	光熱費: "#eab308",
	通信: "#06b6d4",
	税金: "#64748b",
	貯蓄: "#10b981",
	その他: "#94a3b8",
};

export function categoryColor(category: string): string {
	return CATEGORY_COLORS[category] ?? "#94a3b8";
}
