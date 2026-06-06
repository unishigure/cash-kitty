import { useCallback, useEffect, useRef, useState } from "react";
import { checkOcrHealth } from "../lib/ocr";

export type OcrStatus = "checking" | "online" | "offline";

export interface OcrHealthApi {
	/** Current reachability of the OCR API. */
	status: OcrStatus;
	/** Re-run the health check (e.g. after the user starts the API). */
	recheck: () => void;
}

/**
 * Probe the OCR API's health endpoint so the UI can block image capture while
 * the API is unreachable (otherwise an analyze request would hang / fail only
 * after the fact). Re-checks when the base URL changes, on manual retry, and
 * when the app regains focus (the API may have come up meanwhile).
 */
export function useOcrHealth(apiBaseUrl: string): OcrHealthApi {
	const [status, setStatus] = useState<OcrStatus>("checking");
	// Only the latest check may update state, so a slow stale request (e.g. after
	// the base URL changed or the component unmounted) can't clobber the result.
	const runId = useRef(0);

	const recheck = useCallback(() => {
		const id = ++runId.current;
		setStatus("checking");
		checkOcrHealth(apiBaseUrl)
			.then(() => {
				if (id === runId.current) setStatus("online");
			})
			.catch(() => {
				if (id === runId.current) setStatus("offline");
			});
	}, [apiBaseUrl]);

	useEffect(() => {
		recheck();
	}, [recheck]);

	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === "visible") recheck();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [recheck]);

	return { status, recheck };
}
