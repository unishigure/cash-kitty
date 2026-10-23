import { describe, expect, test } from "bun:test";
import {
	type CaptureAction,
	type CaptureQueue,
	captureReducer,
	currentItem,
	EMPTY_QUEUE,
	nextToAnalyze,
	progress,
} from "./captureQueue";

const image = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function run(...actions: CaptureAction[]): CaptureQueue {
	return actions.reduce(captureReducer, EMPTY_QUEUE);
}

const addThree = (ocr = true): CaptureAction => ({
	type: "add",
	ocr,
	items: ["a", "b", "c"].map((id) => ({
		id,
		image: image(`${id}.jpg`),
		previewUrl: `blob:${id}`,
	})),
});

const ocrResult = (storeName: string) => ({
	storeName,
	totalAmount: 1200,
	date: "2026-10-01",
	fullText: `${storeName}\n合計 1200`,
	processingTimeMs: 10,
});

const kinds = (queue: CaptureQueue) => queue.map((i) => i.state.kind);

describe("captureReducer", () => {
	test("analyzes one image at a time, in order, while the first is reviewed", () => {
		let q = run(addThree());
		expect(nextToAnalyze(q)?.id).toBe("a");
		q = captureReducer(q, { type: "analyzeStart", id: "a" });
		expect(nextToAnalyze(q)).toBeUndefined();
		q = captureReducer(q, {
			type: "analyzeDone",
			id: "a",
			result: ocrResult("イオン"),
		});
		expect(currentItem(q)?.form).toMatchObject({
			storeName: "イオン",
			totalAmount: "1200",
			date: "2026-10-01",
		});
		expect(currentItem(q)?.fullText).toBe("イオン\n合計 1200");
		expect(nextToAnalyze(q)?.id).toBe("b");
		expect(kinds(q)).toEqual(["review", "queued", "queued"]);
	});

	test("sends images straight to review when OCR is not configured", () => {
		const q = run(addThree(false));
		expect(kinds(q)).toEqual(["review", "review", "review"]);
		expect(nextToAnalyze(q)).toBeUndefined();
	});

	test("saving an item opens the next one, and the queue empties after the last", () => {
		let q = run(addThree(false), { type: "saveStart", id: "a" });
		expect(currentItem(q)?.id).toBe("a");
		q = captureReducer(q, { type: "saveDone", id: "a" });
		expect(currentItem(q)?.id).toBe("b");
		expect(progress(q)).toEqual({ position: 2, total: 3 });
		q = run(
			addThree(false),
			{ type: "saveStart", id: "a" },
			{ type: "saveDone", id: "a" },
			{ type: "skip", id: "b" },
			{ type: "saveStart", id: "c" },
			{ type: "saveDone", id: "c" },
		);
		expect(q).toEqual(EMPTY_QUEUE);
	});

	test("a failed save returns the item to review with the error", () => {
		const q = run(
			addThree(false),
			{ type: "saveStart", id: "a" },
			{ type: "saveFail", id: "a", error: "offline" },
		);
		expect(currentItem(q)?.state).toEqual({ kind: "review", error: "offline" });
	});

	test("an OCR failure can still be entered by hand and saved, or retried", () => {
		let q = run(
			addThree(),
			{ type: "analyzeStart", id: "a" },
			{ type: "analyzeFail", id: "a", error: "OCR に失敗しました" },
		);
		expect(currentItem(q)?.state).toEqual({
			kind: "failed",
			error: "OCR に失敗しました",
		});
		expect(nextToAnalyze(q)?.id).toBe("b");
		q = captureReducer(q, {
			type: "edit",
			id: "a",
			key: "totalAmount",
			value: "500",
		});
		expect(captureReducer(q, { type: "saveStart", id: "a" })[0]?.state).toEqual(
			{
				kind: "saving",
			},
		);
		q = captureReducer(q, { type: "retry", id: "a" });
		expect(nextToAnalyze(q)?.id).toBe("a");
		expect(currentItem(q)?.form.totalAmount).toBe("500");
	});

	test("skipping an item being analyzed ignores its late result", () => {
		const q = run(
			addThree(),
			{ type: "analyzeStart", id: "a" },
			{ type: "skip", id: "a" },
			{ type: "analyzeDone", id: "a", result: ocrResult("イオン") },
		);
		expect(kinds(q)).toEqual(["skipped", "queued", "queued"]);
		expect(currentItem(q)?.id).toBe("b");
	});

	test("OCR fills only the fields it found and keeps what was typed meanwhile", () => {
		const q = run(
			addThree(),
			{ type: "edit", id: "a", key: "storeName", value: "手入力" },
			{ type: "edit", id: "a", key: "category", value: "食費" },
			{ type: "analyzeStart", id: "a" },
			{
				type: "analyzeDone",
				id: "a",
				result: { ...ocrResult(""), totalAmount: null },
			},
		);
		expect(currentItem(q)?.form).toMatchObject({
			storeName: "手入力",
			category: "食費",
			totalAmount: "",
			date: "2026-10-01",
		});
	});

	test("edits are ignored while an item is saving", () => {
		const q = run(
			addThree(false),
			{ type: "edit", id: "a", key: "memo", value: "before" },
			{ type: "saveStart", id: "a" },
			{ type: "edit", id: "a", key: "memo", value: "after" },
		);
		expect(currentItem(q)?.form.memo).toBe("before");
	});

	test("a manual entry without a photo is reviewable at once", () => {
		const q = run({
			type: "add",
			ocr: true,
			items: [{ id: "m", image: null, previewUrl: null }],
		});
		expect(currentItem(q)?.state).toEqual({ kind: "review" });
		expect(nextToAnalyze(q)).toBeUndefined();
	});

	test("retaking a photo re-queues it for OCR", () => {
		const q = run(addThree(false), {
			type: "retake",
			id: "a",
			image: image("a2.jpg"),
			previewUrl: "blob:a2",
			ocr: true,
		});
		expect(currentItem(q)).toMatchObject({
			previewUrl: "blob:a2",
			state: { kind: "queued" },
		});
	});
});
