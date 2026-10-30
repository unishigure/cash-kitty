import { type SubmitEvent, useState } from "react";
import { useModalDialog } from "../hooks/useModalDialog";
import { type Receipt, updateReceipt } from "../lib/receipt";
import { buttonClass, formatError } from "../lib/ui";
import {
  type Draft,
  draftFromReceipt,
  parseDraft,
  ReceiptFields,
} from "./ReceiptFields";

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
      onSaved(await updateReceipt(receipt, parsed.input));
    } catch (error) {
      setError(formatError(error));
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      className="m-auto w-full max-w-md border border-gray-400 p-0 backdrop:bg-black/40"
      aria-labelledby="receipt-edit-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <fieldset
          className="grid gap-3 p-4 disabled:opacity-60"
          disabled={saving}
        >
          <h2 id="receipt-edit-title" className="text-xl font-bold">
            明細の編集
          </h2>
          <ReceiptFields draft={draft} onChange={updateDraft} />
          {error && <p role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              className={buttonClass}
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              キャンセル
            </button>
            <button className={buttonClass} type="submit">
              {saving ? "保存中…" : "保存する"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
