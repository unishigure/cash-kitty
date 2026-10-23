import { useCallback, useState } from "react";
import { newId } from "../lib/id";
import { analyzeReceipt } from "../lib/ocr";
import {
	EMPTY_RECEIPT_FORM,
	parseReceiptForm,
	type ReceiptFormState,
} from "../lib/receiptForm";
import type { Receipt } from "../lib/types";
import type { useGoogleDrive } from "./useGoogleDrive";

type Drive = ReturnType<typeof useGoogleDrive>;

/**
 * Receipt capture + OCR state.
 *
 * Lives in `App` (not in `CaptureTab`) so that switching the bottom-nav
 * tab away from "取り込み" and back does not unmount the state: an in-flight
 * OCR analysis keeps running and its result still lands in the form.
 */
export function useReceiptCapture(apiBaseUrl: string, drive: Drive) {
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [analyzing, setAnalyzing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [form, setForm] = useState<ReceiptFormState>(EMPTY_RECEIPT_FORM);
	const [fullText, setFullText] = useState("");

	const setField = useCallback(
		<K extends keyof ReceiptFormState>(key: K, value: ReceiptFormState[K]) =>
			setForm((f) => ({ ...f, [key]: value })),
		[],
	);

	const reset = useCallback(() => {
		setImageFile(null);
		setPreview((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
		setForm(EMPTY_RECEIPT_FORM);
		setFullText("");
	}, []);

	const analyze = useCallback(
		async (file: File) => {
			setError(null);
			setDone(false);
			setImageFile(file);
			setPreview((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return URL.createObjectURL(file);
			});

			setAnalyzing(true);
			try {
				const result = await analyzeReceipt(apiBaseUrl, file);
				setForm((f) => ({
					...f,
					storeName: result.storeName || f.storeName,
					totalAmount:
						result.totalAmount != null
							? String(result.totalAmount)
							: f.totalAmount,
					date: result.date || f.date,
				}));
				setFullText(result.fullText);
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setAnalyzing(false);
			}
		},
		[apiBaseUrl],
	);

	/** Validate + persist to Drive. Returns true on success. */
	const save = useCallback(async (): Promise<boolean> => {
		setError(null);
		const parsed = parseReceiptForm(form);
		if (!parsed.ok) {
			setError(parsed.error);
			return false;
		}
		const now = new Date().toISOString();
		const receipt: Receipt = {
			id: newId(),
			...parsed.value,
			fullText: fullText || undefined,
			createdAt: now,
			updatedAt: now,
		};
		setSaving(true);
		try {
			await drive.saveReceipt(receipt, imageFile ?? undefined);
			setDone(true);
			reset();
			setTimeout(() => setDone(false), 2500);
			return true;
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			return false;
		} finally {
			setSaving(false);
		}
	}, [form, fullText, drive, imageFile, reset]);

	return {
		imageFile,
		preview,
		analyzing,
		saving,
		error,
		done,
		form,
		setField,
		setError,
		analyze,
		reset,
		save,
	};
}

export type ReceiptCapture = ReturnType<typeof useReceiptCapture>;
