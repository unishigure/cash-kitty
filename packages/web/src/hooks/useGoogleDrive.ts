import { useCallback, useEffect, useRef, useState } from "react";
import { MISSING_CLIENT_ID_MESSAGE } from "../lib/config";
import {
	createReceipt,
	deleteFile,
	getFileBlob,
	loadPreferences,
	type StoredPreferences,
	savePreferences,
	syncReceipts,
	UnauthorizedError,
	updateReceipt,
	uploadFile,
} from "../lib/drive";
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
import {
	clearLocalPreferences,
	DEFAULT_PREFERENCES,
	loadLocalPreferences,
	type Preferences,
	saveLocalPreferences,
} from "../lib/preferences";
import {
	clearCachedReceipts,
	loadCachedReceipts,
	saveCachedReceipts,
} from "../lib/receiptCache";
import type { Receipt } from "../lib/types";

export type DriveStatus = "disconnected" | "connecting" | "connected" | "error";

export type SyncState =
	| { kind: "idle" }
	| { kind: "syncing" }
	| { kind: "synced"; at: string }
	| { kind: "error"; message: string };

interface UseGoogleDrive {
	status: DriveStatus;
	/** Every receipt the user has, in no particular order. */
	receipts: Receipt[];
	syncState: SyncState;
	/** Connection error (failed auth redirect, missing client id). */
	error: string | null;
	/** Connect (interactive consent if needed). */
	connect: () => Promise<void>;
	disconnect: () => void;
	/** Bring `receipts` and `preferences` in line with Drive. Concurrent calls share one run. */
	sync: () => Promise<Receipt[]>;
	preferences: Preferences;
	/** Apply locally right away, then write to Drive. Reverts if the write fails. */
	updatePreferences: (preferences: Preferences) => Promise<void>;
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
	const [receipts, setReceipts] = useState<Receipt[]>([]);
	// Async work (sync, save) must read the latest collection, not the one
	// captured by the render that started it.
	const receiptsRef = useRef<Receipt[]>([]);
	// Bumped by every local save/delete so a sync that listed files before the
	// change knows its result is stale.
	const mutationsRef = useRef(0);
	// Bumped on disconnect so an in-flight sync cannot repopulate the store.
	const sessionRef = useRef(0);
	const inflightRef = useRef<Promise<Receipt[]> | null>(null);
	const [syncState, setSyncState] = useState<SyncState>({ kind: "idle" });
	const [error, setError] = useState<string | null>(null);
	const clientIdRef = useRef(clientId);
	clientIdRef.current = clientId;

	const commit = useCallback((next: Receipt[]) => {
		receiptsRef.current = next;
		setReceipts(next);
		void saveCachedReceipts(next);
	}, []);

	const [preferences, setPreferences] = useState(loadLocalPreferences);
	const preferencesRef = useRef(preferences);
	const preferencesFileIdRef = useRef<string | undefined>(undefined);
	// Bumped by every local change so a sync that read the file before the
	// change does not overwrite it.
	const preferenceWritesRef = useRef(0);
	// Writes run one at a time so the file id learned by a create is reused.
	const preferenceQueueRef = useRef<Promise<unknown>>(Promise.resolve());

	const commitPreferences = useCallback((next: Preferences) => {
		preferencesRef.current = next;
		setPreferences(next);
		saveLocalPreferences(next);
	}, []);

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
			if (!id) throw new Error(MISSING_CLIENT_ID_MESSAGE);
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

	const sync = useCallback((): Promise<Receipt[]> => {
		if (inflightRef.current) return inflightRef.current;
		const session = sessionRef.current;
		const run = (async () => {
			setSyncState({ kind: "syncing" });
			try {
				let next: Receipt[];
				let stored: StoredPreferences;
				let mutations: number;
				let preferenceWrites: number;
				do {
					mutations = mutationsRef.current;
					preferenceWrites = preferenceWritesRef.current;
					[next, stored] = await withToken(
						(t) =>
							Promise.all([
								syncReceipts(t, receiptsRef.current),
								loadPreferences(t),
							]),
						true,
					);
				} while (mutations !== mutationsRef.current);
				if (session !== sessionRef.current) return [];
				commit(next);
				preferencesFileIdRef.current ??= stored.fileId;
				if (preferenceWrites === preferenceWritesRef.current) {
					commitPreferences(stored.preferences);
				}
				setSyncState({ kind: "synced", at: new Date().toISOString() });
				setStatus("connected");
				return next;
			} catch (e) {
				if (session === sessionRef.current) {
					setSyncState({
						kind: "error",
						message: e instanceof Error ? e.message : String(e),
					});
				}
				throw e;
			} finally {
				inflightRef.current = null;
			}
		})();
		inflightRef.current = run;
		return run;
	}, [withToken, commit, commitPreferences]);

	const updatePreferences = useCallback(
		async (next: Preferences) => {
			const previous = preferencesRef.current;
			preferenceWritesRef.current++;
			commitPreferences(next);
			const write = preferenceQueueRef.current.then(() =>
				withToken(async (t) => {
					preferencesFileIdRef.current = await savePreferences(
						t,
						next,
						preferencesFileIdRef.current,
					);
				}, false),
			);
			preferenceQueueRef.current = write.catch(() => {});
			try {
				await write;
			} catch (e) {
				if (preferencesRef.current === next) commitPreferences(previous);
				throw e;
			}
		},
		[withToken, commitPreferences],
	);

	const connect = useCallback(async () => {
		const id = clientIdRef.current;
		if (!id) {
			setError(MISSING_CLIENT_ID_MESSAGE);
			setStatus("error");
			return;
		}
		setError(null);
		// Stays "connecting" while the browser navigates to Google. The
		// round-trip lands back on the settings tab, where the mount effect picks
		// up the token (or the error) from the URL fragment.
		setStatus("connecting");
		beginAuthRedirect(id, "interactive", "settings");
	}, []);

	const disconnect = useCallback(() => {
		signOut();
		sessionRef.current++;
		receiptsRef.current = [];
		setReceipts([]);
		void clearCachedReceipts();
		preferencesRef.current = DEFAULT_PREFERENCES;
		preferencesFileIdRef.current = undefined;
		setPreferences(DEFAULT_PREFERENCES);
		clearLocalPreferences();
		setSyncState({ kind: "idle" });
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
			}, false);
			mutationsRef.current++;
			commit([...receiptsRef.current.filter((r) => r.id !== saved.id), saved]);
		},
		[withToken, commit],
	);

	const removeReceipt = useCallback(
		async (receipt: Receipt) => {
			if (receipt.fileId || receipt.imageFileId) {
				await withToken(async (t) => {
					if (receipt.imageFileId) await deleteFile(t, receipt.imageFileId);
					if (receipt.fileId) await deleteFile(t, receipt.fileId);
				}, false);
			}
			mutationsRef.current++;
			commit(receiptsRef.current.filter((r) => r.id !== receipt.id));
		},
		[withToken, commit],
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

	// On mount: show the IndexedDB copy right away, then reconnect.
	// `consumeAuthRedirect()` (frontend.tsx) has already stored any token that
	// came back in the URL fragment before React rendered, so there are three
	// cases: a valid token (from the redirect or surviving in localStorage) →
	// connected, sync in the background; no token but a prior connection →
	// leave for a *silent* (prompt=none) auth redirect, which bounces straight
	// back with a token while the Google session is intact; a failed
	// interactive attempt → surface its error.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only once on mount.
	useEffect(() => {
		const hydrated = loadCachedReceipts().then((cached) => {
			if (cached && mutationsRef.current === 0 && !receiptsRef.current.length) {
				receiptsRef.current = cached;
				setReceipts(cached);
			}
		});
		if (!clientId) return;
		const redirectError = getAuthRedirectError();
		if (redirectError) {
			setError(redirectError);
			setStatus("error");
			return;
		}
		if (hasValidToken()) {
			setStatus("connected");
			void hydrated.then(sync).catch(() => {
				/* surfaced through syncState */
			});
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
		receipts,
		syncState,
		error,
		connect,
		disconnect,
		sync,
		preferences,
		updatePreferences,
		saveReceipt,
		removeReceipt,
		loadImageUrl,
	};
}
