/** A single receipt record, stored as one JSON file in the Drive appDataFolder. */
export interface Receipt {
	/** Stable app-level id (also embedded in the Drive file name). */
	id: string;
	/** Drive file id. Absent until the record has been persisted. */
	fileId?: string;
	storeName: string;
	/** Total amount in JPY (integer). */
	totalAmount: number;
	/** Purchase date, ISO `YYYY-MM-DD`. */
	date: string;
	category: string;
	memo?: string;
	/** Drive file id of the stored receipt image, if any. */
	imageFileId?: string;
	/** MIME type of the stored image (e.g. `image/jpeg`). */
	imageMimeType?: string;
	/** Raw OCR text, kept for reference / re-parsing. */
	fullText?: string;
	/** ISO timestamps. */
	createdAt: string;
	updatedAt: string;
	/**
	 * Drive file's `modifiedTime`, attached at fetch time. Runtime-only — used to
	 * skip re-downloading unchanged files during an incremental sync; it is
	 * stripped before writing back to Drive.
	 */
	driveModifiedTime?: string;
}

/** Result of the OCR `/api/ocr/analyze` endpoint. */
export interface OcrResult {
	storeName: string;
	totalAmount: number | null;
	/** Detected purchase date as ISO `YYYY-MM-DD`, or null if not found. */
	date: string | null;
	fullText: string;
	processingTimeMs: number;
}
