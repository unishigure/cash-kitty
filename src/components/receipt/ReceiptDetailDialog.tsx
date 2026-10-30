import { useModalDialog } from "@/hooks/useModalDialog";
import { formatFullDate } from "@/lib/month";
import type { Receipt } from "@/lib/receipt";
import { buttonClass, formatYen } from "@/lib/ui";

export function ReceiptDetailDialog({
  receipt,
  onEdit,
  onDelete,
  onClose,
}: {
  receipt: Receipt;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const dialogRef = useModalDialog();

  const rows = [
    ["日付", formatFullDate(receipt.date)],
    ["カテゴリー", receipt.category],
    ["メモ", receipt.memo || "—"],
  ];

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      className="m-auto w-full max-w-md border border-gray-400 p-0 backdrop:bg-black/40"
      aria-labelledby="receipt-detail-title"
      onClose={onClose}
    >
      <div className="grid gap-4 p-4">
        <div className="grid gap-1">
          <h2 id="receipt-detail-title" className="text-xl font-bold">
            {receipt.storeName}
          </h2>
          <p className="text-right text-3xl font-semibold">
            {formatYen(receipt.totalAmount)}
          </p>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-gray-200 pt-4">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-sm text-gray-600">{label}</dt>
              <dd className="text-right wrap-anywhere whitespace-pre-wrap">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex gap-2">
          <button
            className={`${buttonClass} text-red-700`}
            type="button"
            onClick={onDelete}
          >
            削除
          </button>
          <button
            className={`${buttonClass} ml-auto`}
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            閉じる
          </button>
          <button className={buttonClass} type="button" onClick={onEdit}>
            編集
          </button>
        </div>
      </div>
    </dialog>
  );
}
