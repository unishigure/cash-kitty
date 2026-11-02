import { useId, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { Select } from "@/components/Select";
import { today } from "@/lib/date";
import {
  type Category,
  categories,
  type Receipt,
  type ReceiptInput,
} from "@/lib/receipt";
import { inputClass } from "@/lib/ui";

const labelClass = "grid gap-1 text-std-16B-170 text-solid-gray-800";

function Required() {
  return (
    <span className="ml-1 text-dns-14N-130 font-normal text-error-1">
      ※必須
    </span>
  );
}

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

export function useDraft(initial: () => Draft) {
  const [draft, setDraft] = useState(initial);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return [draft, setDraft, updateDraft] as const;
}

export function parseDraft(
  draft: Draft,
): { ok: true; input: ReceiptInput } | { ok: false; error: string } {
  if (!draft.date) {
    return { ok: false, error: "日付を正しく入力してください。" };
  }
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
  const categoryId = useId();

  return (
    <>
      <fieldset>
        <legend className="mb-1 text-std-16B-170 text-solid-gray-800">
          日付
          <Required />
        </legend>
        <DatePicker
          required
          value={draft.date}
          onChange={(value) => onChange("date", value)}
        />
      </fieldset>
      <label className={labelClass}>
        <span>
          店舗名
          <Required />
        </span>
        <input
          className={inputClass}
          type="text"
          required
          value={draft.storeName}
          onChange={(event) => onChange("storeName", event.target.value)}
        />
      </label>
      <label className={labelClass}>
        <span>
          合計金額（円）
          <Required />
        </span>
        <input
          className={`${inputClass} text-right tabular-nums`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          value={draft.totalAmount}
          onChange={(event) => onChange("totalAmount", event.target.value)}
        />
      </label>
      <label className={labelClass} htmlFor={categoryId}>
        カテゴリー
        <Select
          id={categoryId}
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
        </Select>
      </label>
      <label className={labelClass}>
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
