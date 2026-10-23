import { expect, test } from "bun:test";
import {
	clearCachedReceipts,
	loadCachedReceipts,
	saveCachedReceipts,
} from "./receiptCache";

test("degrades to an empty cache when IndexedDB is unavailable", async () => {
	expect(typeof indexedDB).toBe("undefined");
	await expect(saveCachedReceipts([])).resolves.toBeUndefined();
	await expect(loadCachedReceipts()).resolves.toBeNull();
	await expect(clearCachedReceipts()).resolves.toBeUndefined();
});
