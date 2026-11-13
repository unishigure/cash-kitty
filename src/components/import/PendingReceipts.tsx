import { useState } from "react";

import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { loadReceiptImage } from "@/lib/drive/sync";
import type { Receipt } from "@/lib/receipt/receipt";
import { buttonClass, cardClass, dangerButtonClass } from "@/lib/ui/styles";
import { formatFullDate } from "@/lib/utils/date";

function PendingThumbnail({ receipt }: { receipt: Receipt }) {
  const [image, setImage] = useState<Blob>();
  const [failed, setFailed] = useState(false);
  const url = useObjectUrl(image);

  useAsyncEffect(
    () => loadReceiptImage(receipt),
    {
      onLoad: (blob) => {
        setImage(blob);
        setFailed(!blob);
      },
      onError: () => setFailed(true),
    },
    [receipt],
  );

  return (
    <div className="rounded-8 border-solid-gray-200 bg-solid-gray-50 grid aspect-3/4 place-items-center overflow-hidden border">
      {url ? (
        <img
          className="size-full object-cover"
          src={url}
          alt={`${formatFullDate(receipt.date)} に撮影したレシート`}
        />
      ) : (
        <span className="text-dns-14N-130 text-solid-gray-600 p-2 text-center">
          {failed ? "画像を読み込めません" : "読み込み中…"}
        </span>
      )}
    </div>
  );
}

export function PendingReceipts({
  receipts,
  disabled,
  onEdit,
  onDelete,
}: {
  receipts: Receipt[];
  disabled: boolean;
  onEdit: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
}) {
  if (!receipts.length) return null;

  return (
    <section className={`grid gap-4 ${cardClass}`}>
      <h2 className="text-std-17B-170 text-solid-gray-900">
        未処理の写真（{receipts.length} 件）
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="grid gap-2">
            <PendingThumbnail receipt={receipt} />
            <span className="text-dns-14N-130 text-solid-gray-600">
              {formatFullDate(receipt.date)}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={buttonClass}
                type="button"
                disabled={disabled}
                onClick={() => onEdit(receipt)}
              >
                入力
              </button>
              <button
                className={dangerButtonClass}
                type="button"
                disabled={disabled}
                onClick={() => onDelete(receipt)}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
