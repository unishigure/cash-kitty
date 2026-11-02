import { type SubmitEvent, useState } from "react";
import {
  type Draft,
  draftFromReceipt,
  parseDraft,
  ReceiptFields,
} from "@/components/receipt/ReceiptFields";
import { ModalDialog } from "@/components/ModalDialog";
import { useModalDialog } from "@/hooks/useModalDialog";
import { type Receipt, updateReceipt } from "@/lib/receipt";
import { buttonClass, formatError, primaryButtonClass } from "@/lib/ui";

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
  const [draft, setDraft] = useState(() => draftFromReceipt(receipt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseDraft(draft);
    if (!parsed.ok) {
      setError(`エラー: ${parsed.error}`);
      return;
    }

    setSaving(true);
    try {
      onSaved(await updateReceipt(receipt.id, parsed.input));
    } catch (error) {
      setError(formatError(error));
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
          {error && (
            <p role="alert" className="text-dns-16N-130 text-error-1">
              {error}
            </p>
          )}
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
