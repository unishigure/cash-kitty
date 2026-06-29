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
	外食: "#dc2626",
	日用品: "#65a30d",
	交通: "#2563eb",
	娯楽: "#9333ea",
	医療: "#0d9488",
	衣服: "#db2777",
	住居費: "#d97706",
	光熱費: "#ca8a04",
	通信: "#0891b2",
	税金: "#475569",
	貯蓄: "#4f46e5",
	その他: "#94a3b8",
};

export function categoryColor(category: string): string {
	return CATEGORY_COLORS[category] ?? "#94a3b8";
}
