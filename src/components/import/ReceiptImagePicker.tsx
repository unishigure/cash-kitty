import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
} from "react";

import { useObjectUrl } from "@/hooks/useObjectUrl";
import { errorStatus, type Status } from "@/lib/ui/status";
import { buttonClass, cardClass, cardLegendClass } from "@/lib/ui/styles";

const canReadClipboard = typeof navigator.clipboard?.read === "function";

export function ReceiptImagePicker({
  file,
  ready,
  disabled,
  onChange,
  onLoad,
  onError,
  notice,
  children,
}: {
  file: File | undefined;
  ready: boolean;
  disabled: boolean;
  onChange: (file: File | undefined) => void;
  onLoad: () => void;
  onError: (status: Status) => void;
  notice?: ReactNode;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = file?.type.startsWith("image/") ?? false;
  const previewUrl = useObjectUrl(isImage ? file : undefined);

  function selectImage(selected: File | undefined) {
    onChange(selected);
    if (selected && !selected.type.startsWith("image/")) {
      onError({ tone: "error", text: "画像ファイルを選択してください。" });
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    selectImage(event.target.files?.[0]);
  }

  function pasteImage(image: File) {
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(image);
      inputRef.current.files = transfer.files;
    }
    selectImage(image);
  }

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (disabled) return;
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
      onError({ tone: "error", text: "クリップボードに画像がありません。" });
    } catch (error) {
      onError(errorStatus(error));
    }
  }

  return (
    <fieldset className={`grid gap-4 ${cardClass}`}>
      <legend className={`flex items-center gap-1 ${cardLegendClass}`}>
        <label htmlFor="receipt-image">レシート画像</label>
        {notice}
      </legend>
      <input
        ref={inputRef}
        id="receipt-image"
        className="rounded-8 border-solid-gray-600 bg-solid-gray-50 text-dns-16N-130 file:rounded-8 file:border-key-900 file:text-oln-16B-100 file:text-key-900 hover:file:bg-key-200 w-full cursor-pointer border border-dashed p-4 file:mr-3 file:min-h-12 file:cursor-pointer file:border file:bg-white file:px-4 hover:border-black disabled:cursor-not-allowed disabled:file:cursor-not-allowed"
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={handleImageChange}
      />
      {canReadClipboard && (
        <button
          className={`${buttonClass} justify-self-center`}
          type="button"
          disabled={disabled}
          onClick={() => void pasteFromClipboard()}
        >
          クリップボードから貼り付け
        </button>
      )}
      {previewUrl && (
        <img
          className="rounded-8 border-solid-gray-200 max-h-120 max-w-full justify-self-center border object-contain"
          src={previewUrl}
          alt="選択したレシートのプレビュー"
          hidden={!ready}
          onLoad={onLoad}
          onError={() =>
            onError({
              tone: "error",
              text: "画像を読み込めません。別の画像を選択してください。",
            })
          }
        />
      )}
      {children}
    </fieldset>
  );
}
