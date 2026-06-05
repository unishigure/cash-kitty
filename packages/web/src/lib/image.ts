/**
 * Downscale and re-encode an image so receipts don't bloat Drive storage.
 * Falls back to the original blob if the browser can't decode it (e.g. HEIC).
 */
export async function compressImage(
	file: Blob,
	maxDim = 2000,
	quality = 0.82,
): Promise<{ blob: Blob; mimeType: string }> {
	try {
		const source = await loadImageSource(file);
		const sw = "width" in source ? source.width : 0;
		const sh = "height" in source ? source.height : 0;
		if (!sw || !sh) throw new Error("unknown image size");

		const scale = Math.min(1, maxDim / Math.max(sw, sh));
		const w = Math.round(sw * scale);
		const h = Math.round(sh * scale);

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("no 2d context");
		ctx.drawImage(source, 0, 0, w, h);
		if ("close" in source) source.close();

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/jpeg", quality),
		);
		if (!blob) throw new Error("toBlob failed");
		return { blob, mimeType: "image/jpeg" };
	} catch {
		return { blob: file, mimeType: file.type || "application/octet-stream" };
	}
}

async function loadImageSource(
	file: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
	if (typeof createImageBitmap === "function") {
		try {
			return await createImageBitmap(file);
		} catch {
			/* fall back to <img> */
		}
	}
	return await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("image decode failed"));
		};
		img.src = url;
	});
}
