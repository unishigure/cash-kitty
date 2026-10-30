export const categories = [
  "食費",
  "日用品",
  "衣服",
  "趣味",
  "交通費",
  "交際費",
  "医療",
  "住居",
  "光熱費",
  "通信費",
  "税金",
  "貯蓄",
  "その他",
] as const;

export type Category = (typeof categories)[number];

export type Receipt = {
  id: string;
  date: string;
  storeName: string;
  totalAmount: number;
  category: Category;
  memo: string;
  fullText?: string;
  createdAt: string;
  updatedAt: string;
  // Google Drive 同期用（未同期の間は undefined）
  fileId?: string;
  driveModifiedTime?: string;
};

export type ReceiptInput = Pick<
  Receipt,
  "date" | "storeName" | "totalAmount" | "category" | "memo" | "fullText"
>;

const dbName = "cash-kitty-v2";
const dbVersion = 1;
const storeName = "receipts";

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName, {
        keyPath: "id",
      });
      store.createIndex("date", "date");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = undefined;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function addReceipt(input: ReceiptInput) {
  const now = new Date().toISOString();
  const receipt: Receipt = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await withStore("readwrite", (store) => store.add(receipt));
  return receipt;
}

/** month は YYYY-MM 形式。日付の新しい順に返す */
export async function listReceiptsByMonth(month: string) {
  const receipts = await withStore("readonly", (store) =>
    store.index("date").getAll(IDBKeyRange.bound(`${month}-01`, `${month}-31`)),
  );
  return (receipts as Receipt[]).sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function deleteReceipt(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}
