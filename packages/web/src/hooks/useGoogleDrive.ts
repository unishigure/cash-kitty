import { useCallback, useEffect, useRef, useState } from "react";
import {
	createReceipt,
	deleteFile,
	getFileBlob,
	listReceipts,
	UnauthorizedError,
	updateReceipt,
	uploadFile,
} from "../lib/drive";
import {
	getAccessToken,
	signOut as gisSignOut,
	hasValidToken,
} from "../lib/googleAuth";
import { compressImage } from "../lib/image";
import type { Receipt } from "../lib/types";

export type DriveStatus = "disconnected" | "connecting" | "connected" | "error";

interface UseGoogleDrive {
	status: DriveStatus;
	receipts: Receipt[];
	loading: boolean;
	error: string | null;
	/** Connect (interactive consent if needed) and load receipts. */
	connect: () => Promise<void>;
	disconnect: () => void;
	refresh: () => Promise<void>;
	/** Save a receipt, optionally uploading its image (on first save). */
	saveReceipt: (receipt: Receipt, image?: Blob) => Promise<void>;
	removeReceipt: (receipt: Receipt) => Promise<void>;
	/** Load a receipt's stored image as an object URL (caller must revoke it). */
	loadImageUrl: (receipt: Receipt) => Promise<string | null>;
}

export function useGoogleDrive(clientId: string): UseGoogleDrive {
	const [status, setStatus] = useState<DriveStatus>(
		hasValidToken() ? "connected" : "disconnected",
	);
	const [receipts, setReceipts] = useState<Receipt[]>([]);
	const [loading, setLoading] = useState(false);
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

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await withToken((t) => listReceipts(t), false);
			setReceipts(data);
			setStatus("connected");
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setStatus("error");
		} finally {
			setLoading(false);
		}
	}, [withToken]);

	const connect = useCallback(async () => {
		setStatus("connecting");
		setLoading(true);
		setError(null);
		try {
			const data = await withToken((t) => listReceipts(t), true);
			setReceipts(data);
			setStatus("connected");
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setStatus("error");
		} finally {
			setLoading(false);
		}
	}, [withToken]);

	const disconnect = useCallback(() => {
		gisSignOut();
		setReceipts([]);
		setStatus("disconnected");
		setError(null);
	}, []);

	const saveReceipt = useCallback(
		async (receipt: Receipt, image?: Blob) => {
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
			setReceipts((prev) => {
				const idx = prev.findIndex((r) => r.id === saved.id);
				const next = idx >= 0 ? prev.slice() : [saved, ...prev];
				if (idx >= 0) next[idx] = saved;
				return next.sort((a, b) =>
					a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
				);
			});
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
			setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
		},
		[withToken],
	);

	const loadImageUrl = useCallback(
		async (receipt: Receipt): Promise<string | null> => {
			if (!receipt.imageFileId) return null;
			const blob = await withToken(
				(t) => getFileBlob(t, receipt.imageFileId!),
				false,
			);
			return URL.createObjectURL(blob);
		},
		[withToken],
	);

	// Auto-load receipts on mount if we already have a token from this session.
	useEffect(() => {
		if (hasValidToken() && clientId) {
			void refresh();
		}
		// Only run once on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		status,
		receipts,
		loading,
		error,
		connect,
		disconnect,
		refresh,
		saveReceipt,
		removeReceipt,
		loadImageUrl,
	};
}
