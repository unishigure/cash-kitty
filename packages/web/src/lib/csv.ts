/**
 * CSV export of receipts. Output targets spreadsheet apps: RFC 4180 quoting,
 * CRLF line endings, and a UTF-8 BOM so Excel detects the encoding and shows
 * Japanese text correctly.
 */
import type { Receipt } from "./types";

const UTF8_BOM = String.fromCharCode(0xfeff);

const CSV_COLUMNS: {
	header: string;
	value: (r: Receipt) => string | number;
}[] = [
	{ header: "日付", value: (r) => r.date },
	{ header: "店名", value: (r) => r.storeName },
	{ header: "金額", value: (r) => r.totalAmount },
	{ header: "カテゴリ", value: (r) => r.category },
	{ header: "メモ", value: (r) => r.memo ?? "" },
	{ header: "作成日時", value: (r) => r.createdAt },
	{ header: "更新日時", value: (r) => r.updatedAt },
	{ header: "ID", value: (r) => r.id },
];

function escapeField(value: string | number): string {
	const s = String(value);
	return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function byDateAsc(a: Receipt, b: Receipt): number {
	return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}

export function receiptsToCsv(receipts: Receipt[]): string {
	const header = CSV_COLUMNS.map((c) => escapeField(c.header)).join(",");
	const rows = [...receipts]
		.sort(byDateAsc)
		.map((r) => CSV_COLUMNS.map((c) => escapeField(c.value(r))).join(","));
	return `${UTF8_BOM}${[header, ...rows].join("\r\n")}\r\n`;
}
