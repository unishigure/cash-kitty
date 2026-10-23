/**
 * IndexedDB copy of the synced receipt collection, so the app can render the
 * last known data before the first Drive round-trip finishes. Every function
 * degrades to a no-op when IndexedDB is missing or fails (private mode, old
 * browsers): the cache is an accelerator, never the source of truth.
 */
import type { Receipt } from "./types";

const DB_NAME = "cash-kitty";
const STORE = "receipts";
const KEY = "all";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const db = await openDb();
	try {
		return await new Promise<T>((resolve, reject) => {
			const tx = db.transaction(STORE, mode);
			const req = run(tx.objectStore(STORE));
			tx.oncomplete = () => resolve(req.result);
			tx.onerror = () => reject(tx.error);
			tx.onabort = () => reject(tx.error);
		});
	} finally {
		db.close();
	}
}

/** The cached receipts, or null when nothing is cached or IndexedDB fails. */
export async function loadCachedReceipts(): Promise<Receipt[] | null> {
	try {
		const value = await withStore<unknown>("readonly", (s) => s.get(KEY));
		return Array.isArray(value) ? (value as Receipt[]) : null;
	} catch {
		return null;
	}
}

// Writes are chained so a later save can never land before an earlier one.
let writes: Promise<void> = Promise.resolve();

function enqueueWrite(
	run: (store: IDBObjectStore) => IDBRequest,
): Promise<void> {
	writes = writes.then(async () => {
		try {
			await withStore("readwrite", run);
		} catch {
			/* best effort */
		}
	});
	return writes;
}

export function saveCachedReceipts(
	receipts: readonly Receipt[],
): Promise<void> {
	return enqueueWrite((s) => s.put(receipts, KEY));
}

export function clearCachedReceipts(): Promise<void> {
	return enqueueWrite((s) => s.delete(KEY));
}
