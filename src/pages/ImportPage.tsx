import { type SubmitEvent, useState } from "react";
import { ReceiptImagePicker } from "@/components/import/ReceiptImagePicker";
import {
  emptyDraft,
  parseDraft,
  ReceiptFields,
  useDraft,
} from "@/components/receipt/ReceiptFields";
import { Notice } from "@/components/ui/Notice";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { checkModelAvailability, extractReceipt } from "@/lib/receipt/ai";
import { compressImage } from "@/lib/receipt/image";
import { addReceipt } from "@/lib/receipt/receipt";
import { formatYen } from "@/lib/ui/format";
import { errorStatus, type Status } from "@/lib/ui/status";
import {
  buttonClass,
  cardClass,
  cardLegendClass,
  primaryButtonClass,
} from "@/lib/ui/styles";

export function ImportPage() {
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "info",
    text: "AI 読み取りの対応状況を確認中…",
  });
  const [file, setFile] = useState<File>();
  const [pickerKey, setPickerKey] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft, updateDraft] = useDraft(emptyDraft);

  useAsyncEffect(
    checkModelAvailability,
    {
      onLoad: (availability) => {
        if (availability === "unsupported" || availability === "unavailable") {
          setStatus({
            tone: "info",
            text: "この環境では AI 読み取りを利用できません。手動での登録が可能です。",
          });
          return;
        }
        setModelReady(true);
        setStatus({
          tone: "info",
          text:
            availability === "available"
              ? "レシート画像を選択してください。"
              : "レシート画像を選択してください。初回の読み取り時にモデルをダウンロードします。",
        });
      },
      onError: (error) => setStatus(errorStatus(error)),
    },
    [],
  );

  function selectImage(selected: File | undefined) {
    setFile(selected);
    setImageReady(false);
  }

  function handlePreviewLoad() {
    setImageReady(true);
    if (modelReady) void analyze();
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setStatus({ tone: "info", text: "モデルを準備中…" });
    try {
      const started = performance.now();
      const extracted = await extractReceipt(file, (ratio) => {
        setStatus({
          tone: "info",
          text: `モデルをダウンロード中: ${Math.round(ratio * 100)}%`,
        });
      });
      setDraft((current) => ({
        ...current,
        ...extracted,
        totalAmount: String(extracted.totalAmount),
      }));
      setStatus({
        tone: "success",
        text: `読み取りました（${((performance.now() - started) / 1000).toFixed(1)} 秒）。内容を確認して保存してください。`,
      });
    } catch (error) {
      setStatus(errorStatus(error));
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setFile(undefined);
    setPickerKey((key) => key + 1);
    setImageReady(false);
    setDraft(emptyDraft());
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseDraft(draft);
    if (!parsed.ok) {
      setStatus({ tone: "error", text: parsed.error });
      return;
    }

    setSaving(true);
    try {
      const image = file && imageReady ? await compressImage(file) : undefined;
      const receipt = await addReceipt(parsed.input, image);
      reset();
      setStatus({
        tone: "success",
        text: `保存しました: ${receipt.storeName} ${formatYen(receipt.totalAmount)}`,
      });
    } catch (error) {
      setStatus(errorStatus(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Notice status={status} />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <ReceiptImagePicker
          key={pickerKey}
          ready={imageReady}
          disabled={analyzing || saving}
          onChange={selectImage}
          onLoad={handlePreviewLoad}
          onError={setStatus}
        >
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
        </ReceiptImagePicker>

        <form onSubmit={handleSubmit}>
          <fieldset
            className={`grid gap-4 disabled:opacity-60 ${cardClass}`}
            disabled={analyzing || saving}
          >
            <legend className={cardLegendClass}>内容の確認</legend>
            <ReceiptFields draft={draft} onChange={updateDraft} />
            <div className="flex justify-end gap-2">
              <button className={buttonClass} type="button" onClick={reset}>
                クリア
              </button>
              <button className={primaryButtonClass} type="submit">
                {saving ? "保存中…" : "保存する"}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
