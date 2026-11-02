import type { Category } from "@/lib/receipt/category";
import { transact, withStore } from "@/lib/receipt/db";
import { isDateInMonth, type YearMonth } from "@/lib/utils/date";
import { createSignal } from "@/lib/utils/store";

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
  imageMimeType?: string;
  fileId?: string;
  imageFileId?: string;
  driveModifiedTime?: string;
  dirty?: boolean;
};

export type ReceiptInput = Pick<
  Receipt,
  "date" | "storeName" | "totalAmount" | "category" | "memo" | "fullText"
>;

export type ReceiptImage = { blob: Blob; mimeType: string };

export type Deletion = Pick<Receipt, "id" | "fileId" | "imageFileId">;

function modifyReceipt(
  tx: IDBTransaction,
  id: string,
  update: (current: Receipt | undefined) => Receipt | "delete" | "keep",
) {
  const receipts = tx.objectStore("receipts");
  const request = receipts.get(id);
  request.onsuccess = () => {
    const next = update(request.result as Receipt | undefined);
    if (next === "delete") {
      receipts.delete(id);
      tx.objectStore("images").delete(id);
    } else if (next !== "keep") {
      receipts.put(next);
    }
  };
}

const localChanges = createSignal();
const remoteChanges = createSignal();

export const subscribeLocalChanges = localChanges.subscribe;
export const subscribeRemoteChanges = remoteChanges.subscribe;

export async function addReceipt(input: ReceiptInput, image?: ReceiptImage) {
  const now = new Date().toISOString();
  const receipt: Receipt = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    imageMimeType: image?.mimeType,
    dirty: true,
  };
  await transact(["receipts", "images"], "readwrite", (tx) => {
    tx.objectStore("receipts").add(receipt);
    if (image) tx.objectStore("images").put(image.blob, receipt.id);
    return () => undefined;
  });
  localChanges.notify();
  return receipt;
}

export async function updateReceipt(id: string, input: ReceiptInput) {
  const updated = await transact(["receipts", "images"], "readwrite", (tx) => {
    let next: Receipt | undefined;
    modifyReceipt(tx, id, (current) => {
      if (!current) return "keep";
      next = {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
        dirty: true,
      };
      return next;
    });
    return () => next;
  });
  if (!updated) throw new Error("明細が見つかりません。");
  localChanges.notify();
  return updated;
}

export function compareReceiptsOldestFirst(a: Receipt, b: Receipt) {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}

export async function listReceiptsBetween(from: YearMonth, to: YearMonth) {
  const receipts = await withStore("receipts", "readonly", (store) =>
    store.index("date").getAll(IDBKeyRange.bound(`${from}-01`, `${to}-31`)),
  );
  return (receipts as Receipt[]).sort(compareReceiptsOldestFirst);
}

export function listReceiptsByMonth(month: YearMonth) {
  return listReceiptsBetween(month, month);
}

export async function listAllReceipts() {
  const receipts = await withStore("receipts", "readonly", (store) =>
    store.getAll(),
  );
  return (receipts as Receipt[]).sort(compareReceiptsOldestFirst);
}

export async function deleteReceipt(id: string) {
  await transact(["receipts", "images", "deletions"], "readwrite", (tx) => {
    modifyReceipt(tx, id, (current) => {
      if (current?.fileId || current?.imageFileId) {
        const { fileId, imageFileId } = current;
        tx.objectStore("deletions").put({ id, fileId, imageFileId });
      }
      return "delete";
    });
    return () => undefined;
  });
  localChanges.notify();
}

export async function getLocalImage(id: string) {
  const blob = await withStore("images", "readonly", (store) => store.get(id));
  return blob instanceof Blob ? blob : undefined;
}

export async function putLocalImage(id: string, blob: Blob) {
  await withStore("images", "readwrite", (store) => store.put(blob, id));
}

export async function listDeletions() {
  const deletions = await withStore("deletions", "readonly", (store) =>
    store.getAll(),
  );
  return deletions as Deletion[];
}

export async function clearDeletion(id: string) {
  await withStore("deletions", "readwrite", (store) => store.delete(id));
}

export async function markPushed(
  pushed: Receipt,
  patch: Pick<Receipt, "fileId" | "imageFileId" | "driveModifiedTime">,
) {
  return transact(["receipts", "images"], "readwrite", (tx) => {
    let stillStored = false;
    modifyReceipt(tx, pushed.id, (current) => {
      if (!current) return "keep";
      stillStored = true;
      return {
        ...current,
        ...patch,
        dirty: current.updatedAt !== pushed.updatedAt,
      };
    });
    return () => stillStored;
  });
}

export async function applyRemoteReceipts(receipts: Receipt[]) {
  if (!receipts.length) return;
  await transact(["receipts", "images"], "readwrite", (tx) => {
    for (const remote of receipts) {
      modifyReceipt(tx, remote.id, (current) =>
        current?.dirty ? "keep" : remote,
      );
    }
    return () => undefined;
  });
  remoteChanges.notify();
}

export async function applyRemoteDeletions(ids: string[]) {
  if (!ids.length) return [];
  const detached = await transact(["receipts", "images"], "readwrite", (tx) => {
    const detached: string[] = [];
    for (const id of ids) {
      modifyReceipt(tx, id, (current) => {
        if (!current?.dirty) return "delete";
        detached.push(id);
        return { ...current, fileId: undefined, driveModifiedTime: undefined };
      });
    }
    return () => detached;
  });
  remoteChanges.notify();
  return detached;
}

export async function forgetDriveReceipts() {
  await transact(["receipts", "images", "deletions"], "readwrite", (tx) => {
    const receipts = tx.objectStore("receipts");
    const request = receipts.getAll();
    request.onsuccess = () => {
      for (const receipt of request.result as Receipt[]) {
        if (!receipt.fileId && !receipt.imageFileId) continue;
        if (receipt.dirty) {
          receipts.put({
            ...receipt,
            fileId: undefined,
            imageFileId: undefined,
            driveModifiedTime: undefined,
          });
        } else {
          receipts.delete(receipt.id);
          tx.objectStore("images").delete(receipt.id);
        }
      }
    };
    tx.objectStore("deletions").clear();
    return () => undefined;
  });
  remoteChanges.notify();
}

function normalizeForSearch(text: string) {
  return text.normalize("NFKC").toLowerCase();
}

function matchesQuery(receipt: Receipt, query: string) {
  const haystack = normalizeForSearch(`${receipt.storeName} ${receipt.memo}`);
  return normalizeForSearch(query)
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export type ReceiptConditions = {
  month?: YearMonth;
  date?: string;
  category?: Category;
  query: string;
};

export function filterReceipts(
  receipts: Receipt[],
  { month, date, category, query }: ReceiptConditions,
) {
  const trimmed = query.trim();
  return receipts.filter(
    (receipt) =>
      (!month || isDateInMonth(receipt.date, month)) &&
      (!date || receipt.date === date) &&
      (!category || receipt.category === category) &&
      (!trimmed || matchesQuery(receipt, trimmed)),
  );
}

export function replaceReceipt(receipts: Receipt[], saved: Receipt) {
  return removeReceipt(receipts, saved.id)
    .concat(saved)
    .sort(compareReceiptsOldestFirst);
}

export function removeReceipt(receipts: Receipt[], id: string) {
  return receipts.filter((receipt) => receipt.id !== id);
}
