import { useCallback, useEffect, useRef, useState } from "react";
import {
	countReceipts,
	createReceipt,
	deleteFile,
	getFileBlob,
	migrateReceiptFiles,
	syncReceipts,
	UnauthorizedError,
	updateReceipt,
	uploadFile,
} from "../lib/drive";
import { monthKey } from "../lib/format";
import {
	getAccessToken,
	signOut as gisSignOut,
	hasValidToken,
	wasConnected,
} from "../lib/googleAuth";
import { compressImage } from "../lib/image";
import type { Receipt } from "../lib/types";

export type DriveStatus = "disconnected" | "connecting" | "connected" | "error";

/** Sort receipts by date, newest first. */
function byDateDesc(a: Receipt, b: Receipt): number {
	return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

interface UseGoogleDrive {
	status: DriveStatus;
	/** Receipts cached per `YYYY-MM` month, populated on demand by `loadMonth`. */
	receiptsByMonth: Record<string, Receipt[]>;
	/** Total saved receipts across all months (cheap metadata-only count). */
	totalCount: number;
	/** Receipts still using the legacy file name; > 0 means a migration is available. */
	legacyCount: number;
	loading: boolean;
	/** True while an explicit migration is running. */
	migrating: boolean;
	error: string | null;
	/** Connect (interactive consent if needed). */
	connect: () => Promise<void>;
	disconnect: () => void;
	/** (Re)fetch a single month's receipts from Drive. */
	loadMonth: (month: string) => Promise<void>;
	/** Migrate legacy files to the month-stamped scheme. Returns the count migrated. */
	migrate: () => Promise<number>;
	/** Save a receipt, optionally uploading its image (on first save). */
	saveReceipt: (receipt: Receipt, image?: Blob) => Promise<void>;
	removeReceipt: (receipt: Receipt) => Promise<void>;
	/** Load a receipt's stored image as an object URL (caller must revoke it). */
	loadImageUrl: (receipt: Receipt) => Promise<string | null>;
}

export function useGoogleDrive(clientId: string): UseGoogleDrive {
	const [status, setStatus] = useState<DriveStatus>(
		hasValidToken()
			? "connected"
			: wasConnected()
				? "connecting"
				: "disconnected",
	);
	const [receiptsByMonth, setReceiptsByMonth] = useState<
		Record<string, Receipt[]>
	>({});
	// Mirror the cache in a ref so `loadMonth` can read the latest months without
	// listing them as deps (which would change its identity and re-trigger the
	// StatsTab fetch effect on every cache update — an infinite loop).
	const cacheRef = useRef(receiptsByMonth);
	cacheRef.current = receiptsByMonth;
	const [totalCount, setTotalCount] = useState(0);
	const [legacyCount, setLegacyCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [migrating, setMigrating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const clientIdRef = useRef(clientId);
	clientIdRef.current = clientId;

	/**
	 * Run a Drive operation with a valid token. Tries a silent token first; if
	 * the call comes back 401, re-authenticates interactively once and retries.
	 */
	const withToken = useCallback(
		async <T>(
			op: (token: string) => Promise<T>,
			interactive: boolean,
		): Promise<T> => {
			const id = clientIdRef.current;
			if (!id) throw new Error("Google クライアント ID が設定されていません");
			let token = await getAccessToken(id, interactive);
			try {
				return await op(token);
			} catch (e) {
				if (e instanceof UnauthorizedError) {
					gisSignOut();
					token = await getAccessToken(id, true);
					return op(token);
				}
				throw e;
			}
		},
		[],
	);

	const loadMonth = useCallback(
		async (month: string) => {
			setLoading(true);
			setError(null);
			try {
				// Incremental: reuse already-fetched receipts, download only new or
				// changed files.
				const cached = cacheRef.current[month] ?? [];
				const data = await withToken(
					(t) => syncReceipts(t, month, cached),
					false,
				);
				setReceiptsByMonth((prev) => ({ ...prev, [month]: data }));
				setStatus("connected");
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
				setStatus("error");
			} finally {
				setLoading(false);
			}
		},
		[withToken],
	);

	const connect = useCallback(async () => {
		setStatus("connecting");
		setLoading(true);
		setError(null);
		try {
			// Interactive op to drive consent; also seeds the receipt census.
			const { total, legacy } = await withToken((t) => countReceipts(t), true);
			setTotalCount(total);
			setLegacyCount(legacy);
			setStatus("connected");
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setStatus("error");
		} finally {
			setLoading(false);
		}
	}, [withToken]);

	const migrate = useCallback(async (): Promise<number> => {
		setMigrating(true);
		setError(null);
		try {
			const migrated = await withToken((t) => migrateReceiptFiles(t), true);
			// Re-census and drop the month cache so re-opened months pick up the
			// now-renamed files.
			const { total, legacy } = await withToken((t) => countReceipts(t), false);
			setTotalCount(total);
			setLegacyCount(legacy);
			setReceiptsByMonth({});
			return migrated;
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			throw e;
		} finally {
			setMigrating(false);
		}
	}, [withToken]);

	const disconnect = useCallback(() => {
		gisSignOut();
		setReceiptsByMonth({});
		setTotalCount(0);
		setLegacyCount(0);
		setStatus("disconnected");
		setError(null);
	}, []);

	const saveReceipt = useCallback(
		async (receipt: Receipt, image?: Blob) => {
			const isCreate = !receipt.fileId;
			const saved = await withToken(async (t) => {
				let toSave = receipt;
				// Upload the image once, on first save, and remember its file id.
				if (image && !receipt.imageFileId) {
					const { blob, mimeType } = await compressImage(image);
					const imageFileId = await uploadFile(
						t,
						`image-${receipt.id}`,
						blob,
						mimeType,
					);
					toSave = { ...receipt, imageFileId, imageMimeType: mimeType };
				}
				return receipt.fileId
					? updateReceipt(t, toSave)
					: createReceipt(t, toSave);
			}, true);
			// Drop the receipt from every cached month, then re-insert it into the
			// month its (possibly edited) date now belongs to. This keeps the cache
			// correct even when an edit moves a receipt across months.
			setReceiptsByMonth((prev) => {
				const next: Record<string, Receipt[]> = {};
				for (const [m, list] of Object.entries(prev)) {
					next[m] = list.filter((r) => r.id !== saved.id);
				}
				const m = monthKey(saved.date);
				next[m] = [...(next[m] ?? []), saved].sort(byDateDesc);
				return next;
			});
			if (isCreate) setTotalCount((c) => c + 1);
		},
		[withToken],
	);

	const removeReceipt = useCallback(
		async (receipt: Receipt) => {
			if (receipt.fileId || receipt.imageFileId) {
				await withToken(async (t) => {
					if (receipt.imageFileId) await deleteFile(t, receipt.imageFileId);
					if (receipt.fileId) await deleteFile(t, receipt.fileId);
				}, true);
			}
			setReceiptsByMonth((prev) => {
				const next: Record<string, Receipt[]> = {};
				for (const [m, list] of Object.entries(prev)) {
					next[m] = list.filter((r) => r.id !== receipt.id);
				}
				return next;
			});
			setTotalCount((c) => Math.max(0, c - 1));
		},
		[withToken],
	);

	const loadImageUrl = useCallback(
		async (receipt: Receipt): Promise<string | null> => {
			const { imageFileId } = receipt;
			if (!imageFileId) return null;
			const blob = await withToken((t) => getFileBlob(t, imageFileId), false);
			return URL.createObjectURL(blob);
		},
		[withToken],
	);

	// Auto-reconnect on mount. If a valid token survived (localStorage persists it
	// across task kills / restarts), mark connected. Otherwise, if the user
	// connected before, try a *silent* token grant (no popup) — this keeps the
	// connection alive as long as the Google session and prior consent are
	// intact. A silent failure quietly falls back to disconnected (no error
	// shown). Either way we only seed the total count here; the per-month data is
	// fetched lazily by `loadMonth` when the stats view asks for a month.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only once on mount.
	useEffect(() => {
		if (!clientId) return;
		const interactive = !hasValidToken();
		if (interactive && !wasConnected()) return;
		if (!interactive) setStatus("connected");
		else setStatus("connecting");
		void (async () => {
			try {
				const { total, legacy } = await withToken(
					(t) => countReceipts(t),
					false,
				);
				setTotalCount(total);
				setLegacyCount(legacy);
				setStatus("connected");
			} catch {
				setStatus("disconnected");
			}
		})();
	}, []);

	return {
		status,
		receiptsByMonth,
		totalCount,
		legacyCount,
		loading,
		migrating,
		error,
		connect,
		disconnect,
		loadMonth,
		migrate,
		saveReceipt,
		removeReceipt,
		loadImageUrl,
	};
}
