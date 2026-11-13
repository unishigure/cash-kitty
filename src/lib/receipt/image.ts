import type { ReceiptImage } from "@/lib/receipt/receipt";

// blob: URL はアプリと同じオリジンで開かれるため、SVG や HTML を画像として
// 扱うとスクリプトが動く。ラスタ画像の MIME だけを受け付ける
const receiptImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export function isReceiptImageType(type: string | undefined) {
  return type !== undefined && receiptImageTypes.has(type.toLowerCase());
}

export class UnsupportedImageError extends Error {
  override name = "UnsupportedImageError";
  constructor() {
    super(
      "対応していない画像形式です。JPEG や PNG などの写真を選択してください。",
    );
  }
}

export async function compressImage(
  file: Blob,
  maxSize = 2000,
  quality = 0.82,
): Promise<ReceiptImage> {
  if (!isReceiptImageType(file.type)) throw new UnsupportedImageError();
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("toBlob failed");
    return { blob, mimeType: "image/jpeg" };
  } catch {
    return { blob: file, mimeType: file.type };
  }
}
