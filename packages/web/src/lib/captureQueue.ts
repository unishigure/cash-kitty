/**
 * The capture queue: images (or a manual entry) waiting to be reviewed and
 * saved one at a time, in order. OCR runs ahead of the item under review, one
 * request at a time. A single capture is a queue of one.
 */
import { EMPTY_RECEIPT_FORM, type ReceiptFormState } from "./receiptForm";
import type { OcrResult } from "./types";

export type ItemState =
	| { kind: "queued" }
	| { kind: "analyzing" }
	/** `error` is the last failed save, if any. */
	| { kind: "review"; error?: string }
	/** OCR failed. The item can still be reviewed by hand, or retried. */
	| { kind: "failed"; error: string }
	| { kind: "saving" }
	| { kind: "saved" }
	| { kind: "skipped" };

export interface CaptureItem {
	id: string;
	/** Null for a manual entry with no photo. */
	image: File | null;
	previewUrl: string | null;
	form: ReceiptFormState;
	fullText: string;
	state: ItemState;
}

export type CaptureAction =
	| {
			type: "add";
			items: { id: string; image: File | null; previewUrl: string | null }[];
			/** Whether OCR is configured; without it items go straight to review. */
			ocr: boolean;
	  }
	| {
			type: "retake";
			id: string;
			image: File;
			previewUrl: string;
			ocr: boolean;
	  }
	| { type: "analyzeStart"; id: string }
	| { type: "analyzeDone"; id: string; result: OcrResult }
	| { type: "analyzeFail"; id: string; error: string }
	| { type: "retry"; id: string }
	| {
			type: "edit";
			id: string;
			key: keyof ReceiptFormState;
			value: string;
	  }
	| { type: "saveStart"; id: string }
	| { type: "saveDone"; id: string }
	| { type: "saveFail"; id: string; error: string }
	| { type: "skip"; id: string };

export type CaptureQueue = readonly CaptureItem[];

export const EMPTY_QUEUE: CaptureQueue = [];

const isDone = (item: CaptureItem) =>
	item.state.kind === "saved" || item.state.kind === "skipped";

const EDITABLE = new Set<ItemState["kind"]>([
	"queued",
	"analyzing",
	"review",
	"failed",
]);

/** The item under review: the first one not yet saved or skipped. */
export function currentItem(queue: CaptureQueue): CaptureItem | undefined {
	return queue.find((item) => !isDone(item));
}

/** The next item for OCR, or none while a request is in flight. */
export function nextToAnalyze(queue: CaptureQueue): CaptureItem | undefined {
	if (queue.some((item) => item.state.kind === "analyzing")) return undefined;
	return queue.find((item) => item.state.kind === "queued");
}

/** 1-based position of the current item, e.g. 「3 / 5」. */
export function progress(queue: CaptureQueue): {
	position: number;
	total: number;
} {
	const current = currentItem(queue);
	return {
		position: current ? queue.indexOf(current) + 1 : queue.length,
		total: queue.length,
	};
}

export function captureReducer(
	queue: CaptureQueue,
	action: CaptureAction,
): CaptureQueue {
	if (action.type === "add") {
		return [
			...queue,
			...action.items.map(
				(item): CaptureItem => ({
					...item,
					form: EMPTY_RECEIPT_FORM,
					fullText: "",
					state:
						item.image && action.ocr ? { kind: "queued" } : { kind: "review" },
				}),
			),
		];
	}

	const next = queue.map((item) =>
		item.id === action.id ? transition(item, action) : item,
	);
	// Once every item is settled the batch is over and the queue empties.
	return next.every(isDone) ? EMPTY_QUEUE : next;
}

function transition(
	item: CaptureItem,
	action: Exclude<CaptureAction, { type: "add" }>,
): CaptureItem {
	const { state } = item;
	switch (action.type) {
		case "retake":
			return EDITABLE.has(state.kind)
				? {
						...item,
						image: action.image,
						previewUrl: action.previewUrl,
						fullText: "",
						state: action.ocr ? { kind: "queued" } : { kind: "review" },
					}
				: item;
		case "analyzeStart":
			return state.kind === "queued"
				? { ...item, state: { kind: "analyzing" } }
				: item;
		case "analyzeDone": {
			if (state.kind !== "analyzing") return item;
			const { result } = action;
			return {
				...item,
				form: {
					...item.form,
					storeName: result.storeName || item.form.storeName,
					totalAmount:
						result.totalAmount != null
							? String(result.totalAmount)
							: item.form.totalAmount,
					date: result.date || item.form.date,
				},
				fullText: result.fullText,
				state: { kind: "review" },
			};
		}
		case "analyzeFail":
			return state.kind === "analyzing"
				? { ...item, state: { kind: "failed", error: action.error } }
				: item;
		case "retry":
			return state.kind === "failed" && item.image
				? { ...item, state: { kind: "queued" } }
				: item;
		case "edit":
			return EDITABLE.has(state.kind)
				? { ...item, form: { ...item.form, [action.key]: action.value } }
				: item;
		case "saveStart":
			return state.kind === "review" || state.kind === "failed"
				? { ...item, state: { kind: "saving" } }
				: item;
		case "saveDone":
			return state.kind === "saving"
				? { ...item, state: { kind: "saved" } }
				: item;
		case "saveFail":
			return state.kind === "saving"
				? { ...item, state: { kind: "review", error: action.error } }
				: item;
		case "skip":
			return EDITABLE.has(state.kind)
				? { ...item, state: { kind: "skipped" } }
				: item;
	}
}
