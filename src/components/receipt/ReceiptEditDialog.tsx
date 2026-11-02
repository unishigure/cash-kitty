import { type SubmitEvent, useState } from "react";
import { ModalDialog } from "@/components/ModalDialog";
import { Notice } from "@/components/Notice";
import {
  draftFromReceipt,
  parseDraft,
  ReceiptFields,
  useDraft,
} from "@/components/receipt/ReceiptFields";
import { useModalDialog } from "@/hooks/useModalDialog";
import { type Receipt, updateReceipt } from "@/lib/receipt/receipt";
import { errorStatus, type Status } from "@/lib/ui/status";
import { buttonClass, primaryButtonClass } from "@/lib/ui/styles";

export function ReceiptEditDialog({
  receipt,
  onSaved,
  onClose,
}: {
  receipt: Receipt;
  onSaved: (receipt: Receipt) => void;
  onClose: () => void;
}) {
  const dialogRef = useModalDialog();
  const [draft, , updateDraft] = useDraft(() => draftFromReceipt(receipt));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseDraft(draft);
    if (!parsed.ok) {
      setStatus({ tone: "error", text: parsed.error });
      return;
    }

    setSaving(true);
    try {
      onSaved(await updateReceipt(receipt.id, parsed.input));
    } catch (error) {
      setStatus(errorStatus(error));
      setSaving(false);
    }
  }

  return (
    <ModalDialog
      ref={dialogRef}
      aria-labelledby="receipt-edit-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <fieldset
          className="grid gap-4 p-4 disabled:opacity-60 md:p-6"
          disabled={saving}
        >
          <h2
            id="receipt-edit-title"
            className="text-std-24B-150 text-solid-gray-900"
          >
            明細の編集
          </h2>
          <ReceiptFields draft={draft} onChange={updateDraft} />
          {status && <Notice status={status} />}
          <div className="flex justify-end gap-2">
            <button
              className={buttonClass}
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              キャンセル
            </button>
            <button className={primaryButtonClass} type="submit">
              {saving ? "保存中…" : "保存する"}
            </button>
          </div>
        </fieldset>
      </form>
    </ModalDialog>
  );
}
