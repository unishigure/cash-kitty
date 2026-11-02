import { type ReactNode, useEffect, useState } from "react";
import { CategoryChip } from "@/components/CategoryChip";
import { useModalDialog } from "@/hooks/useModalDialog";
import { loadReceiptImage } from "@/lib/drive-sync";
import { formatFullDate } from "@/lib/month";
import type { Receipt } from "@/lib/receipt";
import {
  buttonClass,
  dangerButtonClass,
  formatYen,
  primaryButtonClass,
} from "@/lib/ui";

function useReceiptImage(receipt: Receipt) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setUrl(undefined);
    setError(undefined);
    loadReceiptImage(receipt)
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [receipt]);

  return { url, error };
}

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
  const image = useReceiptImage(receipt);

  const rows: [string, ReactNode][] = [
    ["日付", formatFullDate(receipt.date)],
    ["カテゴリー", <CategoryChip key="category" category={receipt.category} />],
    ["メモ", receipt.memo || "—"],
  ];

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-8 border border-black p-0 text-std-16N-170 text-solid-gray-800 shadow-3 backdrop:bg-opacity-gray-600"
      aria-labelledby="receipt-detail-title"
      onClose={onClose}
    >
      <div className="grid gap-4 p-4 md:p-6">
        <div className="grid gap-1">
          <h2
            id="receipt-detail-title"
            className="text-std-24B-150 text-solid-gray-900"
          >
            {receipt.storeName}
          </h2>
          <p className="text-right text-std-32B-150 text-solid-gray-900 tabular-nums">
            {formatYen(receipt.totalAmount)}
          </p>
        </div>

        {image.url && (
          <a href={image.url} target="_blank" rel="noopener">
            <img
              className="mx-auto max-h-80 max-w-full rounded-8 border border-solid-gray-200 object-contain"
              src={image.url}
              alt={`${receipt.storeName}のレシート画像`}
            />
          </a>
        )}
        {image.error && (
          <p className="text-dns-14N-130 text-solid-gray-600">{image.error}</p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-solid-gray-420 pt-4">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-dns-16B-130 text-solid-gray-700">{label}</dt>
              <dd className="text-right wrap-anywhere whitespace-pre-wrap">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex gap-2">
          <button
            className={dangerButtonClass}
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
          <button className={primaryButtonClass} type="button" onClick={onEdit}>
            編集
          </button>
        </div>
      </div>
    </dialog>
  );
}
