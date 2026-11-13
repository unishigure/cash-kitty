import { type SubmitEvent, useState } from "react";

import { PendingReceipts } from "@/components/import/PendingReceipts";
import { ReceiptImagePicker } from "@/components/import/ReceiptImagePicker";
import {
  emptyDraft,
  parseDraft,
  ReceiptFields,
  useDraft,
} from "@/components/receipt/ReceiptFields";
import { HelpPopover } from "@/components/ui/HelpPopover";
import { Notice } from "@/components/ui/Notice";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { useReceiptsRevision } from "@/hooks/useDrive";
import { loadReceiptImage } from "@/lib/drive/sync";
import { checkModelAvailability, extractReceipt } from "@/lib/receipt/ai";
import { compressImage } from "@/lib/receipt/image";
import { processPendingReceipts } from "@/lib/receipt/pending";
import {
  addPendingReceipt,
  addReceipt,
  deleteReceipt,
  listPendingReceipts,
  type Receipt,
  updateReceipt,
} from "@/lib/receipt/receipt";
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
  const [modelUnavailable, setModelUnavailable] = useState(false);
  const [status, setStatus] = useState<Status>({
    tone: "info",
    text: "AI 読み取りの対応状況を確認中…",
  });
  const [file, setFile] = useState<File>();
  const [pickerKey, setPickerKey] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draft, setDraft, updateDraft] = useDraft(emptyDraft);
  const [pending, setPending] = useState<Receipt[]>([]);
  const [pendingRevision, setPendingRevision] = useState(0);
  const [editingPending, setEditingPending] = useState<Receipt>();
  const revision = useReceiptsRevision();
  const busy = analyzing || saving || processing;

  useAsyncEffect(
    checkModelAvailability,
    {
      onLoad: (availability) => {
        if (availability === "unsupported" || availability === "unavailable") {
          setModelUnavailable(true);
          setStatus({ tone: "neutral", text: "" });
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

  useAsyncEffect(
    listPendingReceipts,
    { onLoad: setPending, onError: (error) => setStatus(errorStatus(error)) },
    [revision, pendingRevision],
  );

  function reloadPending() {
    setPendingRevision((value) => value + 1);
  }

  function selectImage(selected: File | undefined) {
    setFile(selected);
    setImageReady(false);
    setEditingPending(undefined);
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
    setEditingPending(undefined);
    setDraft(emptyDraft());
  }

  async function savePending() {
    if (!file) return;
    setSaving(true);
    try {
      await addPendingReceipt(await compressImage(file));
      reset();
      reloadPending();
      setStatus({
        tone: "success",
        text: "写真を保存しました。AI 対応端末でまとめて読み取れます。",
      });
    } catch (error) {
      setStatus(errorStatus(error));
    } finally {
      setSaving(false);
    }
  }

  async function editPending(receipt: Receipt) {
    try {
      const blob = await loadReceiptImage(receipt);
      if (!blob) throw new Error("画像が見つかりません。");
      reset();
      setFile(
        new File([blob], `receipt-${receipt.id}`, {
          type: blob.type || receipt.imageMimeType || "image/jpeg",
        }),
      );
      setEditingPending(receipt);
      setDraft({ ...emptyDraft(), date: receipt.date });
    } catch (error) {
      setStatus(errorStatus(error));
    }
  }

  async function removePending(receipt: Receipt) {
    if (!confirm("この写真を削除しますか？")) return;
    try {
      await deleteReceipt(receipt.id);
      if (editingPending?.id === receipt.id) reset();
      reloadPending();
      setStatus({ tone: "success", text: "写真を削除しました。" });
    } catch (error) {
      setStatus(errorStatus(error));
    }
  }

  async function extractAllPending() {
    reset();
    setProcessing(true);
    try {
      const { processed, failed } = await processPendingReceipts((progress) => {
        setStatus({
          tone: "info",
          text:
            progress.phase === "download"
              ? `モデルをダウンロード中: ${Math.round(progress.ratio * 100)}%`
              : `読み取り中…（${progress.done + 1} / ${progress.total} 件）`,
        });
      });
      setStatus(
        failed
          ? {
              tone: "error",
              text: `${processed} 件を登録し、${failed} 件は読み取れませんでした。読み取れなかった写真は手動で入力してください。`,
            }
          : {
              tone: "success",
              text: `${processed} 件を登録しました。明細から内容を確認できます。`,
            },
      );
    } catch (error) {
      setStatus(errorStatus(error));
    } finally {
      setProcessing(false);
      reloadPending();
    }
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
      let receipt: Receipt;
      if (editingPending) {
        receipt = await updateReceipt(editingPending.id, parsed.input);
        reloadPending();
      } else {
        const image =
          file && imageReady ? await compressImage(file) : undefined;
        receipt = await addReceipt(parsed.input, image);
      }
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
          file={file}
          ready={imageReady}
          disabled={busy}
          onChange={selectImage}
          onLoad={handlePreviewLoad}
          onError={setStatus}
          notice={
            modelUnavailable && (
              <HelpPopover
                id="import-ai-unavailable"
                label="AI 読み取りを利用できません"
                tone="warning"
              >
                この環境では AI 読み取りを利用できません。
                <br />
                手動で登録、または写真のみ保存できます。保存した写真は AI
                対応端末でまとめて読み取れます。
              </HelpPopover>
            )
          }
        >
          {imageReady && (
            <div className="flex flex-wrap justify-end gap-2">
              {!editingPending && (
                <button
                  className={buttonClass}
                  type="button"
                  disabled={busy}
                  onClick={() => void savePending()}
                >
                  あとで読み取る
                </button>
              )}
              {modelReady && (
                <button
                  className={buttonClass}
                  type="button"
                  disabled={busy}
                  onClick={() => void analyze()}
                >
                  {analyzing ? "読み取り中…" : "もう一度読み取る"}
                </button>
              )}
            </div>
          )}
        </ReceiptImagePicker>

        <form onSubmit={handleSubmit}>
          <fieldset
            className={`grid gap-4 disabled:opacity-60 ${cardClass}`}
            disabled={busy}
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

      <PendingReceipts
        receipts={pending}
        canExtract={modelReady}
        disabled={busy}
        onExtractAll={() => void extractAllPending()}
        onEdit={(receipt) => void editPending(receipt)}
        onDelete={(receipt) => void removePending(receipt)}
      />
    </div>
  );
}
