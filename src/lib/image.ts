import type { ReceiptImage } from "@/lib/receipt";

export async function compressImage(
  file: Blob,
  maxSize = 2000,
  quality = 0.82,
): Promise<ReceiptImage> {
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
    return { blob: file, mimeType: file.type || "application/octet-stream" };
  }
}
