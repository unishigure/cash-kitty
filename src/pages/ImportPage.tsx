import {
  type ChangeEvent,
  type SubmitEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { Notice } from "@/components/Notice";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import {
  emptyDraft,
  parseDraft,
  ReceiptFields,
  useDraft,
} from "@/components/receipt/ReceiptFields";
import { compressImage } from "@/lib/image";
import { addReceipt } from "@/lib/receipt";
import { checkModelAvailability, extractReceipt } from "@/lib/receipt-ai";
import { buttonClass, cardClass, primaryButtonClass } from "@/lib/styles";
import { errorStatus, type Status } from "@/lib/status";
import { formatYen } from "@/lib/format";

const canReadClipboard = typeof navigator.clipboard?.read === "function";

const legendClass =
  "float-left mb-1 w-full text-std-17B-170 text-solid-gray-900";

export function ImportPage() {
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "info",
    text: "AI 読み取りの対応状況を確認中…",
  });
  const [file, setFile] = useState<File>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();
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

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    selectImage(event.target.files?.[0]);
  }

  function pasteImage(image: File) {
    if (fileInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(image);
      fileInputRef.current.files = transfer.files;
    }
    selectImage(image);
  }

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (analyzing || saving) return;
    const image = [...(event.clipboardData?.files ?? [])].find((f) =>
      f.type.startsWith("image/"),
    );
    if (!image) return;
    event.preventDefault();
    pasteImage(image);
  });

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  async function pasteFromClipboard() {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        pasteImage(
          new File([blob], `clipboard.${type.split("/")[1]}`, { type }),
        );
        return;
      }
      setStatus({
        tone: "error",
        text: "クリップボードに画像がありません。",
      });
    } catch (error) {
      setStatus(errorStatus(error));
    }
  }

  function selectImage(selected: File | undefined) {
    setImageReady(false);
    setPreviewUrl(undefined);
    setFile(selected);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setStatus({
        tone: "error",
        text: "画像ファイルを選択してください。",
      });
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
    setStatus({
      tone: "error",
      text: "画像を読み込めません。別の画像を選択してください。",
    });
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
    setFileInputKey((key) => key + 1);
    setPreviewUrl(undefined);
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
        <fieldset className={`grid gap-4 ${cardClass}`}>
          <legend className={legendClass}>
            <label htmlFor="receipt-image">レシート画像</label>
          </legend>
          <input
            key={fileInputKey}
            ref={fileInputRef}
            id="receipt-image"
            className="w-full cursor-pointer rounded-8 border border-dashed border-solid-gray-600 bg-solid-gray-50 p-4 text-dns-16N-130 hover:border-black disabled:cursor-not-allowed file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-8 file:border file:border-key-900 file:bg-white file:px-4 file:text-oln-16B-100 file:text-key-900 hover:file:bg-key-200 disabled:file:cursor-not-allowed"
            type="file"
            accept="image/*"
            disabled={analyzing || saving}
            onChange={handleImageChange}
          />
          {canReadClipboard && (
            <button
              className={`${buttonClass} justify-self-center`}
              type="button"
              disabled={analyzing || saving}
              onClick={() => void pasteFromClipboard()}
            >
              クリップボードから貼り付け
            </button>
          )}
          {previewUrl && (
            <img
              className="max-h-120 max-w-full justify-self-center rounded-8 border border-solid-gray-200 object-contain"
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
            className={`grid gap-4 disabled:opacity-60 ${cardClass}`}
            disabled={analyzing || saving}
          >
            <legend className={legendClass}>内容の確認</legend>
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
