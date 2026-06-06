/**
 * Google Drive REST client scoped to the application data folder
 * (`appDataFolder`). Each receipt is stored as one JSON file named
 * `receipt-<YYYY-MM>-<id>.json`. Embedding the month in the file name lets us
 * list (and re-fetch) a single month without downloading every receipt. This
 * folder is hidden from the user's normal Drive UI and is only accessible by
 * this app.
 */
import { monthKey } from "./format";
import type { Receipt } from "./types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

/** Receipt file names start with this; a month-scoped prefix appends `<month>-`. */
const RECEIPT_PREFIX = "receipt-";
/** Matches the new month-stamped file name, e.g. `receipt-2026-06-<id>.json`. */
const MONTH_STAMPED = /^receipt-\d{4}-\d{2}-/;

/** The Drive file name for a receipt, e.g. `receipt-2026-06-<id>.json`. */
function fileName(receipt: Receipt): string {
	return `${RECEIPT_PREFIX}${monthKey(receipt.date)}-${receipt.id}.json`;
}

async function driveFetch(
	token: string,
	url: string,
	init: RequestInit = {},
	/** Status codes to treat as success in addition to 2xx (e.g. 404 on delete). */
	okStatuses: number[] = [],
): Promise<Response> {
	const res = await fetch(url, {
		...init,
		headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
	});
	if (res.status === 401) {
		throw new UnauthorizedError();
	}
	if (!res.ok && !okStatuses.includes(res.status)) {
		let detail = "";
		try {
			const body = (await res.json()) as { error?: { message?: string } };
			detail = body.error?.message ?? "";
		} catch {
			/* ignore */
		}
		throw new Error(
			`Drive API エラー (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
		);
	}
	return res;
}

/** Sentinel error used to signal that the token expired and re-auth is needed. */
export class UnauthorizedError extends Error {
	constructor() {
		super("UNAUTHORIZED");
		this.name = "UnauthorizedError";
	}
}

interface DriveFile {
	id: string;
	name: string;
	/** Drive's last-modified timestamp; used to detect changed files on sync. */
	modifiedTime: string;
}

/**
 * List receipt files in the appDataFolder. With no `prefix`, lists every
 * receipt; with `receipt-<month>-` it lists only that month's files. The Drive
 * `name contains` query does prefix matching, but we re-filter by `startsWith`
 * so the result is exact regardless of how Drive interprets the query.
 */
async function listReceiptFiles(
	token: string,
	prefix: string = RECEIPT_PREFIX,
): Promise<DriveFile[]> {
	const files: DriveFile[] = [];
	let pageToken: string | undefined;
	do {
		const params = new URLSearchParams({
			spaces: "appDataFolder",
			fields: "files(id,name,modifiedTime),nextPageToken",
			pageSize: "1000",
			q: `name contains '${prefix}'`,
		});
		if (pageToken) params.set("pageToken", pageToken);
		const res = await driveFetch(token, `${DRIVE_API}/files?${params}`);
		const body = (await res.json()) as {
			files?: DriveFile[];
			nextPageToken?: string;
		};
		files.push(...(body.files ?? []));
		pageToken = body.nextPageToken;
	} while (pageToken);
	return files.filter((f) => f.name.startsWith(prefix));
}

/** Fetch and parse the JSON content of a single Drive file. */
async function getReceiptContent(
	token: string,
	file: DriveFile,
): Promise<Receipt | null> {
	const res = await driveFetch(
		token,
		`${DRIVE_API}/files/${file.id}?alt=media`,
	);
	try {
		const raw = (await res.json()) as Partial<Receipt>;
		return normalizeReceipt(raw, file.id, file.modifiedTime);
	} catch {
		return null;
	}
}

/**
 * Coerce a raw JSON object into a valid Receipt, filling in defaults for any
 * missing fields. This protects the UI from older or hand-edited files that may
 * lack `date`, `category`, etc.
 */
function normalizeReceipt(
	raw: Partial<Receipt>,
	fileId: string,
	modifiedTime: string,
): Receipt {
	const created = typeof raw.createdAt === "string" ? raw.createdAt : "";
	// Best-effort date: explicit date -> createdAt's date -> empty.
	const date =
		typeof raw.date === "string" && raw.date
			? raw.date.slice(0, 10)
			: created.slice(0, 10);
	return {
		id: typeof raw.id === "string" && raw.id ? raw.id : fileId,
		fileId,
		storeName: typeof raw.storeName === "string" ? raw.storeName : "",
		totalAmount: Number.isFinite(raw.totalAmount) ? Number(raw.totalAmount) : 0,
		date,
		category:
			typeof raw.category === "string" && raw.category
				? raw.category
				: "その他",
		memo: typeof raw.memo === "string" ? raw.memo : undefined,
		imageFileId:
			typeof raw.imageFileId === "string" ? raw.imageFileId : undefined,
		imageMimeType:
			typeof raw.imageMimeType === "string" ? raw.imageMimeType : undefined,
		fullText: typeof raw.fullText === "string" ? raw.fullText : undefined,
		createdAt: created,
		updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : created,
		driveModifiedTime: modifiedTime,
	};
}

function byDateDesc(a: Receipt, b: Receipt): number {
	return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

/**
 * Incrementally load one month's receipts, reusing `cached` entries to avoid
 * re-downloading content. Only the file list (cheap metadata) is always
 * fetched; content is downloaded only for files that are new or whose
 * `modifiedTime` changed since they were cached. Files no longer present on
 * Drive are dropped. Pass `cached: []` for a full load. Sorted by date desc.
 */
export async function syncReceipts(
	token: string,
	month: string,
	cached: Receipt[],
): Promise<Receipt[]> {
	const prefix = `${RECEIPT_PREFIX}${month}-`;
	const files = await listReceiptFiles(token, prefix);
	const byFileId = new Map(
		cached.filter((r) => r.fileId).map((r) => [r.fileId, r]),
	);
	const receipts = await Promise.all(
		files.map((f) => {
			const hit = byFileId.get(f.id);
			// Reuse the cached receipt when its file is unchanged.
			if (hit && hit.driveModifiedTime === f.modifiedTime) return hit;
			return getReceiptContent(token, f);
		}),
	);
	return receipts.filter((r): r is Receipt => r !== null).sort(byDateDesc);
}

/** Rename a Drive file (metadata-only patch). */
async function renameFile(
	token: string,
	fileId: string,
	name: string,
): Promise<void> {
	await driveFetch(token, `${DRIVE_API}/files/${fileId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify({ name }),
	});
}

/**
 * Cheap, metadata-only census of stored receipts: the total count and how many
 * still use the legacy `receipt-<id>.json` name (detectable by name alone, no
 * content fetch). A non-zero `legacy` means a migration is available.
 */
export async function countReceipts(
	token: string,
): Promise<{ total: number; legacy: number }> {
	const files = await listReceiptFiles(token);
	const legacy = files.filter((f) => !MONTH_STAMPED.test(f.name)).length;
	return { total: files.length, legacy };
}

/**
 * Migrate legacy `receipt-<id>.json` files to the month-stamped
 * `receipt-<YYYY-MM>-<id>.json` scheme so they show up in month-scoped queries.
 * This reads each legacy file's content (to derive its month) and renames it,
 * so it can be slow with many files — run it explicitly, not on every connect.
 * Idempotent: already-stamped files are skipped. Returns the number migrated.
 */
export async function migrateReceiptFiles(token: string): Promise<number> {
	const files = await listReceiptFiles(token);
	const legacy = files.filter((f) => !MONTH_STAMPED.test(f.name));
	let migrated = 0;
	for (const f of legacy) {
		const receipt = await getReceiptContent(token, f);
		// Skip files with no derivable month — renaming would just orphan them.
		if (!receipt || !monthKey(receipt.date)) continue;
		await renameFile(token, f.id, fileName(receipt));
		migrated++;
	}
	return migrated;
}

/** Strip runtime-only fields so they aren't persisted into the Drive file. */
function toStored(receipt: Receipt): Omit<Receipt, "driveModifiedTime"> {
	const { driveModifiedTime: _omit, ...stored } = receipt;
	return stored;
}

function multipartBody(
	metadata: object,
	json: object,
): { body: Blob; boundary: string } {
	const boundary = "cash-kitty-boundary-x7f3a";
	const parts =
		`--${boundary}\r\n` +
		"Content-Type: application/json; charset=UTF-8\r\n\r\n" +
		JSON.stringify(metadata) +
		`\r\n--${boundary}\r\n` +
		"Content-Type: application/json; charset=UTF-8\r\n\r\n" +
		JSON.stringify(json) +
		`\r\n--${boundary}--`;
	return { body: new Blob([parts]), boundary };
}

/** Create a new receipt file. Returns the receipt with its assigned fileId. */
export async function createReceipt(
	token: string,
	receipt: Receipt,
): Promise<Receipt> {
	const metadata = {
		name: fileName(receipt),
		parents: ["appDataFolder"],
		mimeType: "application/json",
	};
	const { body, boundary } = multipartBody(metadata, toStored(receipt));
	const res = await driveFetch(
		token,
		`${UPLOAD_API}/files?uploadType=multipart&fields=id,modifiedTime`,
		{
			method: "POST",
			headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
			body,
		},
	);
	const created = (await res.json()) as { id: string; modifiedTime: string };
	return {
		...receipt,
		fileId: created.id,
		driveModifiedTime: created.modifiedTime,
	};
}

/**
 * Overwrite an existing receipt file's content. Also keeps the file name in
 * sync with the receipt's month (a multipart patch updates name + content in
 * one request), so editing a receipt's date moves it to the correct month.
 */
export async function updateReceipt(
	token: string,
	receipt: Receipt,
): Promise<Receipt> {
	if (!receipt.fileId) return createReceipt(token, receipt);
	const { body, boundary } = multipartBody(
		{ name: fileName(receipt) },
		toStored(receipt),
	);
	const res = await driveFetch(
		token,
		`${UPLOAD_API}/files/${receipt.fileId}?uploadType=multipart&fields=id,modifiedTime`,
		{
			method: "PATCH",
			headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
			body,
		},
	);
	const updated = (await res.json()) as { modifiedTime: string };
	return { ...receipt, driveModifiedTime: updated.modifiedTime };
}

/** Delete a file by id. A 404 (already gone) is treated as success. */
export async function deleteFile(token: string, fileId: string): Promise<void> {
	await driveFetch(
		token,
		`${DRIVE_API}/files/${fileId}`,
		{ method: "DELETE" },
		[404],
	);
}

/** Delete a receipt file. A 404 (already gone) is treated as success. */
export async function deleteReceipt(
	token: string,
	fileId: string,
): Promise<void> {
	await deleteFile(token, fileId);
}

/** Upload a binary file (e.g. a receipt image) to the appDataFolder. Returns its file id. */
export async function uploadFile(
	token: string,
	name: string,
	blob: Blob,
	mimeType: string,
): Promise<string> {
	const boundary = "cash-kitty-bin-boundary-q9k2";
	const metadata = { name, parents: ["appDataFolder"], mimeType };
	const body = new Blob([
		`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
		JSON.stringify(metadata),
		`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
		blob,
		`\r\n--${boundary}--`,
	]);
	const res = await driveFetch(
		token,
		`${UPLOAD_API}/files?uploadType=multipart&fields=id`,
		{
			method: "POST",
			headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
			body,
		},
	);
	const created = (await res.json()) as { id: string };
	return created.id;
}

/** Fetch a file's raw content as a Blob (e.g. to display a stored image). */
export async function getFileBlob(
	token: string,
	fileId: string,
): Promise<Blob> {
	const res = await driveFetch(token, `${DRIVE_API}/files/${fileId}?alt=media`);
	return res.blob();
}
