import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
	captureReducer,
	currentItem,
	EMPTY_QUEUE,
	nextToAnalyze,
	progress,
} from "../lib/captureQueue";
import { newId } from "../lib/id";
import { analyzeReceipt } from "../lib/ocr";
import { parseReceiptForm, type ReceiptFormState } from "../lib/receiptForm";
import type { Receipt } from "../lib/types";
import type { useGoogleDrive } from "./useGoogleDrive";

type Drive = ReturnType<typeof useGoogleDrive>;

const errorMessage = (e: unknown) =>
	e instanceof Error ? e.message : String(e);

/**
 * Receipt capture queue + OCR.
 *
 * Lives in `App` (not in `CaptureTab`) so that switching the bottom-nav
 * tab away from "取り込み" and back does not unmount the state: in-flight
 * OCR keeps running and its results still land in the queue.
 */
export function useReceiptCapture(apiBaseUrl: string, drive: Drive) {
	const [queue, dispatch] = useReducer(captureReducer, EMPTY_QUEUE);
	const [done, setDone] = useState(false);
	const doneTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const ocr = Boolean(apiBaseUrl);
	const current = currentItem(queue);

	// The OCR server is a single local instance, so a request for a skipped or
	// retaken item still holds it until it settles. `settled` re-runs the
	// effect once it does.
	const busyRef = useRef(false);
	const [settled, bumpSettled] = useReducer((n: number) => n + 1, 0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `settled` only re-triggers the check after a request ends.
	useEffect(() => {
		const item = nextToAnalyze(queue);
		if (!item?.image || busyRef.current) return;
		busyRef.current = true;
		dispatch({ type: "analyzeStart", id: item.id });
		analyzeReceipt(apiBaseUrl, item.image)
			.then((result) => dispatch({ type: "analyzeDone", id: item.id, result }))
			.catch((e: unknown) =>
				dispatch({ type: "analyzeFail", id: item.id, error: errorMessage(e) }),
			)
			.finally(() => {
				busyRef.current = false;
				bumpSettled();
			});
	}, [queue, settled, apiBaseUrl]);

	const previewsRef = useRef(new Set<string>());
	useEffect(() => {
		const live = new Set(
			queue.flatMap((item) => (item.previewUrl ? [item.previewUrl] : [])),
		);
		for (const url of previewsRef.current) {
			if (!live.has(url)) URL.revokeObjectURL(url);
		}
		previewsRef.current = live;
	}, [queue]);

	const addImages = useCallback(
		(files: readonly File[]) => {
			if (!files.length) return;
			setDone(false);
			dispatch({
				type: "add",
				ocr,
				items: files.map((image) => ({
					id: newId(),
					image,
					previewUrl: URL.createObjectURL(image),
				})),
			});
		},
		[ocr],
	);

	/** Replace the current item's photo and analyze it again. */
	const retake = useCallback(
		(image: File) => {
			if (!current) return addImages([image]);
			dispatch({
				type: "retake",
				id: current.id,
				image,
				previewUrl: URL.createObjectURL(image),
				ocr,
			});
		},
		[current, addImages, ocr],
	);

	const setField = useCallback(
		<K extends keyof ReceiptFormState>(key: K, value: ReceiptFormState[K]) => {
			let id = current?.id;
			if (!id) {
				id = newId();
				setDone(false);
				dispatch({
					type: "add",
					ocr,
					items: [{ id, image: null, previewUrl: null }],
				});
			}
			dispatch({ type: "edit", id, key, value });
		},
		[current, ocr],
	);

	const skip = useCallback(() => {
		if (current) dispatch({ type: "skip", id: current.id });
	}, [current]);

	const retry = useCallback(() => {
		if (current) dispatch({ type: "retry", id: current.id });
	}, [current]);

	/** Validate + persist the current item to Drive. Returns true on success. */
	const save = useCallback(async (): Promise<boolean> => {
		if (!current) return false;
		const { id } = current;
		const parsed = parseReceiptForm(current.form);
		if (!parsed.ok) return false;
		const now = new Date().toISOString();
		const receipt: Receipt = {
			id: newId(),
			...parsed.value,
			fullText: current.fullText || undefined,
			createdAt: now,
			updatedAt: now,
		};
		dispatch({ type: "saveStart", id });
		try {
			await drive.saveReceipt(receipt, current.image ?? undefined);
			dispatch({ type: "saveDone", id });
			setDone(true);
			clearTimeout(doneTimerRef.current);
			doneTimerRef.current = setTimeout(() => setDone(false), 2500);
			return true;
		} catch (e) {
			dispatch({ type: "saveFail", id, error: errorMessage(e) });
			return false;
		}
	}, [current, drive]);

	return {
		queue,
		current,
		progress: progress(queue),
		done,
		addImages,
		retake,
		setField,
		skip,
		retry,
		save,
	};
}

export type ReceiptCapture = ReturnType<typeof useReceiptCapture>;
