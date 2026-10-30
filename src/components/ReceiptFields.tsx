import {
  type Category,
  categories,
  type Receipt,
  type ReceiptInput,
} from "../lib/receipt";
import { inputClass, today } from "../lib/ui";

export type Draft = {
  date: string;
  storeName: string;
  totalAmount: string;
  category: Category;
  memo: string;
};

export function emptyDraft(): Draft {
  return {
    date: today(),
    storeName: "",
    totalAmount: "",
    category: "その他",
    memo: "",
  };
}

export function draftFromReceipt(receipt: Receipt): Draft {
  return {
    date: receipt.date,
    storeName: receipt.storeName,
    totalAmount: String(receipt.totalAmount),
    category: receipt.category,
    memo: receipt.memo,
  };
}

export function parseDraft(
  draft: Draft,
): { ok: true; input: ReceiptInput } | { ok: false; error: string } {
  const totalAmount = Number(draft.totalAmount);
  if (!Number.isInteger(totalAmount) || totalAmount < 0) {
    return { ok: false, error: "合計金額は 0 以上の整数で入力してください。" };
  }
  const input: ReceiptInput = {
    date: draft.date,
    storeName: draft.storeName.trim(),
    totalAmount,
    category: draft.category,
    memo: draft.memo.trim(),
  };
  return { ok: true, input };
}

export function ReceiptFields({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  return (
    <>
      <label className="grid gap-1">
        日付
        <input
          className={inputClass}
          type="date"
          required
          value={draft.date}
          onChange={(event) => onChange("date", event.target.value)}
        />
      </label>
      <label className="grid gap-1">
        店舗名
        <input
          className={inputClass}
          type="text"
          required
          value={draft.storeName}
          onChange={(event) => onChange("storeName", event.target.value)}
        />
      </label>
      <label className="grid gap-1">
        合計金額（円）
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          value={draft.totalAmount}
          onChange={(event) => onChange("totalAmount", event.target.value)}
        />
      </label>
      <label className="grid gap-1">
        カテゴリー
        <select
          className={inputClass}
          value={draft.category}
          onChange={(event) =>
            onChange("category", event.target.value as Category)
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        メモ
        <textarea
          className={`${inputClass} resize-y`}
          rows={2}
          value={draft.memo}
          onChange={(event) => onChange("memo", event.target.value)}
        />
      </label>
    </>
  );
}
