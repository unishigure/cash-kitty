import { ReceiptDetailDialog } from "@/components/receipt/ReceiptDetailDialog";
import { ReceiptEditDialog } from "@/components/receipt/ReceiptEditDialog";
import { formatShortDate } from "@/lib/month";
import { deleteReceipt, type Receipt } from "@/lib/receipt";
import { formatYen } from "@/lib/ui";

export type OpenedReceipt = { receipt: Receipt; mode: "detail" | "edit" };

export function ReceiptDialogs({
  opened,
  onOpenedChange,
  onSaved,
  onDeleted,
  onError,
}: {
  opened: OpenedReceipt | undefined;
  onOpenedChange: (opened: OpenedReceipt | undefined) => void;
  onSaved: (receipt: Receipt) => void;
  onDeleted: (receipt: Receipt) => void;
  onError: (error: unknown) => void;
}) {
  if (!opened) return null;
  const { receipt } = opened;

  async function handleDelete() {
    if (
      !confirm(
        `${formatShortDate(receipt.date)} ${receipt.storeName} ${formatYen(receipt.totalAmount)} を削除しますか？`,
      )
    ) {
      return;
    }
    try {
      await deleteReceipt(receipt.id);
      onOpenedChange(undefined);
      onDeleted(receipt);
    } catch (error) {
      onError(error);
    }
  }

  if (opened.mode === "edit") {
    return (
      <ReceiptEditDialog
        receipt={receipt}
        onSaved={(saved) => {
          onOpenedChange({ receipt: saved, mode: "detail" });
          onSaved(saved);
        }}
        onClose={() => onOpenedChange({ receipt, mode: "detail" })}
      />
    );
  }

  return (
    <ReceiptDetailDialog
      receipt={receipt}
      onEdit={() => onOpenedChange({ receipt, mode: "edit" })}
      onDelete={() => void handleDelete()}
      onClose={() => onOpenedChange(undefined)}
    />
  );
}
