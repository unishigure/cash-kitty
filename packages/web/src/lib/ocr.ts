import type { OcrResult } from "./types";

// Bound how long we wait for the OCR API. Without this, a request that never
// settles (e.g. a gateway holding the connection open while the API is down)
// would leave the UI stuck on "解析中…" forever.
const ANALYZE_TIMEOUT_MS = 60_000;
const HEALTH_TIMEOUT_MS = 10_000;

interface AnalyzeResponseBody {
	success: boolean;
	data?: {
		store_name: string;
		total_amount: number | null;
		date?: string | null;
		full_text: string;
	};
	processing_time_ms?: number;
	code?: string;
	message?: string;
}

/** Send a receipt image to the OCR API and return the parsed fields. */
export async function analyzeReceipt(
	apiBaseUrl: string,
	image: Blob,
): Promise<OcrResult> {
	const base = apiBaseUrl.replace(/\/+$/, "");
	const form = new FormData();
	// Give it a filename so the server sees a real content type.
	const filename = image instanceof File ? image.name : "receipt.jpg";
	form.append("image", image, filename);

	let res: Response;
	try {
		res = await fetch(`${base}/api/ocr/analyze`, {
			method: "POST",
			body: form,
			signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
		});
	} catch (err) {
		if (err instanceof DOMException && err.name === "TimeoutError") {
			throw new Error(
				"OCR サーバーが時間内に応答しませんでした。OCR サーバーが起動しているか確認してください。",
			);
		}
		throw new Error(
			"OCR サーバーに接続できませんでした。OCR サーバーが起動しているか確認してください。",
		);
	}

	let body: AnalyzeResponseBody;
	try {
		body = (await res.json()) as AnalyzeResponseBody;
	} catch {
		throw new Error(
			`OCR サーバーから不正な応答が返されました (HTTP ${res.status})。`,
		);
	}

	if (!res.ok || !body.success || !body.data) {
		throw new Error(
			body.message || `OCR に失敗しました (HTTP ${res.status})。`,
		);
	}

	return {
		storeName: body.data.store_name ?? "",
		totalAmount: body.data.total_amount ?? null,
		date: body.data.date ?? null,
		fullText: body.data.full_text ?? "",
		processingTimeMs: body.processing_time_ms ?? 0,
	};
}

/** Check the OCR API health endpoint. Returns the device string or throws. */
export async function checkOcrHealth(apiBaseUrl: string): Promise<string> {
	const base = apiBaseUrl.replace(/\/+$/, "");
	const res = await fetch(`${base}/api/health`, {
		signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const body = (await res.json()) as { device?: string };
	return body.device ?? "unknown";
}
