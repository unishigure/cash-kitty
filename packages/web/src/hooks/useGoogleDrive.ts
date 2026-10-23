import { useCallback, useEffect, useRef, useState } from "react";
import {
	countReceipts,
	createReceipt,
	deleteFile,
	getFileBlob,
	syncAllReceipts,
	syncReceipts,
	UnauthorizedError,
	updateReceipt,
	uploadFile,
} from "../lib/drive";
import { monthKey } from "../lib/format";
import {
	beginAuthRedirect,
	canSilentReconnect,
	clearToken,
	getAuthRedirectError,
	getValidToken,
	hasValidToken,
	signOut,
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
	loading: boolean;
	error: string | null;
	/** Connect (interactive consent if needed). */
	connect: () => Promise<void>;
	disconnect: () => void;
	/** (Re)fetch a single month's receipts from Drive. */
	loadMonth: (month: string) => Promise<void>;
	loadAllReceipts: () => Promise<Receipt[]>;
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
			: canSilentReconnect()
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
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const clientIdRef = useRef(clientId);
	clientIdRef.current = clientId;

	/**
	 * Run a Drive operation with the cached token. When the token is missing or
	 * rejected (401), *background* ops trigger a one-shot silent redirect
	 * re-auth — the page navigates to Google and reloads with a fresh token.
	 * User-initiated mutations must never navigate away (the form being saved
	 * would be lost), so they fail with a clear reconnect message instead.
	 */
	const withToken = useCallback(
		async <T>(
			op: (token: string) => Promise<T>,
			background: boolean,
		): Promise<T> => {
			const id = clientIdRef.current;
			if (!id) throw new Error("Google クライアント ID が設定されていません");
			const reauth = (): Promise<T> => {
				if (background && canSilentReconnect()) {
					setStatus("connecting");
					beginAuthRedirect(id, "silent");
					return new Promise<T>(() => {}); // page is navigating away
				}
				throw new Error(
					"Google Drive との接続が切れています。設定タブから再接続してください。",
				);
			};
			const token = getValidToken();
			if (!token) return reauth();
			try {
				return await op(token);
			} catch (e) {
				if (e instanceof UnauthorizedError) {
					clearToken();
					return reauth();
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
					true,
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

	const loadAllReceipts = useCallback(async () => {
		const all = await withToken(
			(t) => syncAllReceipts(t, Object.values(cacheRef.current).flat()),
			false,
		);
		const next: Record<string, Receipt[]> = {};
		for (const r of all) {
			const m = monthKey(r.date);
			next[m] = [...(next[m] ?? []), r];
		}
		setReceiptsByMonth(next);
		setTotalCount(all.length);
		return all;
	}, [withToken]);

	const connect = useCallback(async () => {
		const id = clientIdRef.current;
		if (!id) {
			setError("Google クライアント ID が設定されていません");
			setStatus("error");
			return;
		}
		setError(null);
		setStatus("connecting");
		// Keeps the button disabled while the browser navigates to Google. The
		// round-trip lands back on the settings tab, where the mount effect picks
		// up the token (or the error) from the URL fragment.
		setLoading(true);
		beginAuthRedirect(id, "interactive", "settings");
	}, []);

	const disconnect = useCallback(() => {
		signOut();
		setReceiptsByMonth({});
		setTotalCount(0);
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
			}, false);
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
				}, false);
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
			const blob = await withToken((t) => getFileBlob(t, imageFileId), true);
			return URL.createObjectURL(blob);
		},
		[withToken],
	);

	// Auto-reconnect on mount. `consumeAuthRedirect()` (frontend.tsx) has
	// already stored any token that came back in the URL fragment before React
	// rendered, so by the time we run there are three cases: a valid token (from
	// the redirect or surviving in localStorage) → connected; no token but a
	// prior connection → leave for a *silent* (prompt=none) auth redirect, which
	// bounces straight back with a token while the Google session is intact; a
	// failed interactive attempt → surface its error. Here we only seed the
	// total count; per-month data is fetched lazily by `loadMonth`.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only once on mount.
	useEffect(() => {
		if (!clientId) return;
		const redirectError = getAuthRedirectError();
		if (redirectError) {
			setError(redirectError);
			setStatus("error");
			return;
		}
		if (hasValidToken()) {
			setStatus("connected");
			void (async () => {
				try {
					const total = await withToken((t) => countReceipts(t), true);
					setTotalCount(total);
				} catch {
					setStatus("disconnected");
				}
			})();
			return;
		}
		if (canSilentReconnect()) {
			setStatus("connecting");
			beginAuthRedirect(clientId, "silent");
			return;
		}
		setStatus("disconnected");
	}, []);

	return {
		status,
		receiptsByMonth,
		totalCount,
		loading,
		error,
		connect,
		disconnect,
		loadMonth,
		loadAllReceipts,
		saveReceipt,
		removeReceipt,
		loadImageUrl,
	};
}
