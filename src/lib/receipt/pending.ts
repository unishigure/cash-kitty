import { loadReceiptImage } from "@/lib/drive/sync";
import { extractReceipt } from "@/lib/receipt/ai";
import {
  listPendingReceipts,
  type Receipt,
  updateReceipt,
} from "@/lib/receipt/receipt";
import { parseDate } from "@/lib/utils/date";

export type PendingProgress =
  | { phase: "download"; ratio: number }
  | { phase: "extract"; done: number; total: number };

export type PendingResult = { processed: number; failed: number };

function isValidDate(date: string) {
  return !Number.isNaN(parseDate(date).getTime());
}

async function processPendingReceipt(
  receipt: Receipt,
  onDownloadProgress: (ratio: number) => void,
) {
  const image = await loadReceiptImage(receipt);
  if (!image) throw new Error("画像が見つかりません。");
  const extracted = await extractReceipt(image, onDownloadProgress);
  await updateReceipt(receipt.id, {
    ...extracted,
    date: isValidDate(extracted.date) ? extracted.date : receipt.date,
    memo: receipt.memo,
  });
}

export async function processPendingReceipts(
  onProgress: (progress: PendingProgress) => void,
): Promise<PendingResult> {
  const pending = await listPendingReceipts();
  let failed = 0;
  for (const [index, receipt] of pending.entries()) {
    onProgress({ phase: "extract", done: index, total: pending.length });
    try {
      await processPendingReceipt(receipt, (ratio) =>
        onProgress({ phase: "download", ratio }),
      );
    } catch (error) {
      console.error(error);
      failed++;
    }
  }
  return { processed: pending.length - failed, failed };
}
