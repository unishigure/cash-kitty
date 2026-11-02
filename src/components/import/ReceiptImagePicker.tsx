import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { errorStatus, type Status } from "@/lib/ui/status";
import { buttonClass, cardClass, cardLegendClass } from "@/lib/ui/styles";

const canReadClipboard = typeof navigator.clipboard?.read === "function";

export function ReceiptImagePicker({
  ready,
  disabled,
  onChange,
  onLoad,
  onError,
  children,
}: {
  ready: boolean;
  disabled: boolean;
  onChange: (file: File | undefined) => void;
  onLoad: () => void;
  onError: (status: Status) => void;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectImage(selected: File | undefined) {
    setPreviewUrl(undefined);
    onChange(selected);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      onError({ tone: "error", text: "画像ファイルを選択してください。" });
      return;
    }
    setPreviewUrl(URL.createObjectURL(selected));
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
      <legend className={cardLegendClass}>
        <label htmlFor="receipt-image">レシート画像</label>
      </legend>
      <input
        ref={inputRef}
        id="receipt-image"
        className="w-full cursor-pointer rounded-8 border border-dashed border-solid-gray-600 bg-solid-gray-50 p-4 text-dns-16N-130 hover:border-black disabled:cursor-not-allowed file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-8 file:border file:border-key-900 file:bg-white file:px-4 file:text-oln-16B-100 file:text-key-900 hover:file:bg-key-200 disabled:file:cursor-not-allowed"
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
          className="max-h-120 max-w-full justify-self-center rounded-8 border border-solid-gray-200 object-contain"
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
