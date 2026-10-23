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
	食費: "#fd721c",
	外食: "#df0325",
	日用品: "#2ab301",
	交通: "#005bfc",
	娯楽: "#a22cdc",
	医療: "#017f64",
	衣服: "#fe5ec3",
	住居費: "#a05b11",
	光熱費: "#b09803",
	通信: "#04a7ec",
	税金: "#5a66a5",
	貯蓄: "#967dfa",
	その他: "#8b8f93",
};

export function categoryColor(category: string): string {
	return CATEGORY_COLORS[category] ?? "#8b8f93";
}
