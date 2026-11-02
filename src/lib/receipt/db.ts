import { toCategory } from "@/lib/receipt/category";
import type { Receipt } from "@/lib/receipt/receipt";

const dbName = "cash-kitty-v2";
const dbVersion = 2;

type StoreName = "receipts" | "images" | "deletions";

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        const store = db.createObjectStore("receipts", { keyPath: "id" });
        store.createIndex("date", "date");
      }
      if (event.oldVersion < 2) {
        db.createObjectStore("images");
        db.createObjectStore("deletions", { keyPath: "id" });
        renameLegacyCategories(request.transaction);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = undefined;
      reject(request.error);
    };
  });
  return dbPromise;
}

function renameLegacyCategories(tx: IDBTransaction | null) {
  const receipts = tx?.objectStore("receipts");
  const request = receipts?.openCursor();
  if (!request) return;
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    const receipt = cursor.value as Receipt;
    const category = toCategory(receipt.category);
    if (category !== receipt.category) cursor.update({ ...receipt, category });
    cursor.continue();
  };
}

export async function transact<T>(
  names: StoreName[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => () => T,
) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode);
    const result = run(tx);
    tx.oncomplete = () => resolve(result());
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return transact([name], mode, (tx) => {
    const request = run(tx.objectStore(name));
    return () => request.result;
  });
}
