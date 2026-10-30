import { type ChangeEvent, type SubmitEvent, useEffect, useState } from "react";
import { addReceipt, type Category, categories } from "../lib/receipt";
import { checkModelAvailability, extractReceipt } from "../lib/receipt-ai";
import {
  buttonClass,
  formatError,
  formatYen,
  inputClass,
  today,
} from "../lib/ui";

type Draft = {
  date: string;
  storeName: string;
  totalAmount: string;
  category: Category;
  memo: string;
};

function emptyDraft(): Draft {
  return {
    date: today(),
    storeName: "",
    totalAmount: "",
    category: "その他",
    memo: "",
  };
}

export function ReceiptImport() {
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState("AI 読み取りの対応状況を確認中…");
  const [file, setFile] = useState<File>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [imageReady, setImageReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    let cancelled = false;

    checkModelAvailability()
      .then((availability) => {
        if (cancelled) return;
        if (availability === "unsupported" || availability === "unavailable") {
          setStatus(
            "この環境では AI 読み取りを利用できません。手入力で登録できます。",
          );
          return;
        }
        setModelReady(true);
        setStatus(
          availability === "available"
            ? "レシート画像を選択してください。"
            : "レシート画像を選択してください。初回の読み取り時にモデルをダウンロードします。",
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(formatError(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImageReady(false);
    setPreviewUrl(undefined);

    const selected = event.target.files?.[0];
    setFile(selected);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setStatus("エラー: 画像ファイルを選択してください。");
      return;
    }
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handlePreviewLoad() {
    setImageReady(true);
    if (modelReady) void analyze();
  }

  function handlePreviewError() {
    setImageReady(false);
    setStatus("エラー: 画像を読み込めません。別の画像を選択してください。");
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setStatus("モデルを準備中…");
    try {
      const started = performance.now();
      const extracted = await extractReceipt(file, (ratio) => {
        setStatus(`モデルをダウンロード中: ${Math.round(ratio * 100)}%`);
      });
      setDraft((current) => ({
        ...current,
        ...extracted,
        totalAmount: String(extracted.totalAmount),
      }));
      setStatus(
        `読み取りました（${((performance.now() - started) / 1000).toFixed(1)} 秒）。内容を確認して保存してください。`,
      );
    } catch (error) {
      setStatus(formatError(error));
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setFile(undefined);
    setFileInputKey((key) => key + 1);
    setPreviewUrl(undefined);
    setImageReady(false);
    setDraft(emptyDraft());
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalAmount = Number(draft.totalAmount);
    if (!Number.isInteger(totalAmount) || totalAmount < 0) {
      setStatus("エラー: 合計金額は 0 以上の整数で入力してください。");
      return;
    }

    setSaving(true);
    try {
      const receipt = await addReceipt({
        date: draft.date,
        storeName: draft.storeName.trim(),
        totalAmount,
        category: draft.category,
        memo: draft.memo.trim(),
      });
      reset();
      setStatus(
        `保存しました: ${receipt.storeName} ${formatYen(receipt.totalAmount)}`,
      );
    } catch (error) {
      setStatus(formatError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">レシート取込</h1>
      <p role="status" aria-live="polite">
        {status}
      </p>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <fieldset className="grid gap-3 border border-gray-400 p-4">
          <legend className="px-1">
            <label htmlFor="receipt-image">レシート画像</label>
          </legend>
          <input
            key={fileInputKey}
            id="receipt-image"
            className="bg-black/5 p-1.5 cursor-pointer disabled:cursor-not-allowed file:mr-3 file:cursor-pointer disabled:file:cursor-not-allowed file:border file:border-gray-400 file:bg-gray-100 file:px-3 file:py-1"
            type="file"
            accept="image/*"
            disabled={analyzing || saving}
            onChange={handleImageChange}
          />
          {previewUrl && (
            <img
              className="max-h-120 max-w-full justify-self-center object-contain"
              src={previewUrl}
              alt="選択したレシートのプレビュー"
              hidden={!imageReady}
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
          )}
          {modelReady && imageReady && (
            <button
              className={`${buttonClass} justify-self-end`}
              type="button"
              disabled={analyzing || saving}
              onClick={() => void analyze()}
            >
              {analyzing ? "読み取り中…" : "もう一度読み取る"}
            </button>
          )}
        </fieldset>

        <form onSubmit={handleSubmit}>
          <fieldset
            className="grid gap-3 border border-gray-400 p-4 disabled:opacity-60"
            disabled={analyzing || saving}
          >
            <legend className="px-1">内容の確認</legend>
            <label className="grid gap-1">
              日付
              <input
                className={inputClass}
                type="date"
                required
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
              />
            </label>
            <label className="grid gap-1">
              店舗名
              <input
                className={inputClass}
                type="text"
                required
                value={draft.storeName}
                onChange={(event) =>
                  updateDraft("storeName", event.target.value)
                }
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
                onChange={(event) =>
                  updateDraft("totalAmount", event.target.value)
                }
              />
            </label>
            <label className="grid gap-1">
              カテゴリー
              <select
                className={inputClass}
                value={draft.category}
                onChange={(event) =>
                  updateDraft("category", event.target.value as Category)
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
                onChange={(event) => updateDraft("memo", event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button className={buttonClass} type="button" onClick={reset}>
                クリア
              </button>
              <button className={buttonClass} type="submit">
                {saving ? "保存中…" : "保存する"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
