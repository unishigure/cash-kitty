import { afterEach, describe, expect, test } from "bun:test";
import { syncReceipts } from "./drive";
import type { Receipt } from "./types";

interface FakeFile {
	id: string;
	name: string;
	modifiedTime: string;
	content: Partial<Receipt>;
}

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

function serveDrive(files: FakeFile[], delayMs = 0) {
	const contentFetches: string[] = [];
	let inFlight = 0;
	let maxInFlight = 0;
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const url = new URL(String(input));
		if (url.pathname === "/drive/v3/files") {
			return Response.json({
				files: files.map(({ id, name, modifiedTime }) => ({
					id,
					name,
					modifiedTime,
				})),
			});
		}
		const id = url.pathname.split("/").pop() ?? "";
		contentFetches.push(id);
		inFlight++;
		maxInFlight = Math.max(maxInFlight, inFlight);
		await new Promise((r) => setTimeout(r, delayMs));
		inFlight--;
		const file = files.find((f) => f.id === id);
		return file
			? Response.json(file.content)
			: Response.json({}, { status: 404 });
	}) as typeof fetch;
	return {
		contentFetches,
		get maxInFlight() {
			return maxInFlight;
		},
	};
}

function file(id: string, modifiedTime: string): FakeFile {
	return {
		id,
		name: `receipt-2026-06-${id}.json`,
		modifiedTime,
		content: {
			id,
			storeName: `store ${id}`,
			totalAmount: 100,
			date: "2026-06-01",
			category: "食費",
			createdAt: "2026-06-01T00:00:00Z",
			updatedAt: "2026-06-01T00:00:00Z",
		},
	};
}

function cachedFrom(f: FakeFile, storeName: string): Receipt {
	return {
		...(f.content as Receipt),
		storeName,
		fileId: f.id,
		driveModifiedTime: f.modifiedTime,
	};
}

describe("syncReceipts", () => {
	test("reuses unchanged receipts, refetches changed ones, adds new ones, drops deleted ones", async () => {
		const unchanged = file("a", "t1");
		const changed = file("b", "t2-new");
		const added = file("c", "t3");
		const drive = serveDrive([unchanged, changed, added]);
		const cached = [
			cachedFrom(unchanged, "cached a"),
			{ ...cachedFrom(changed, "cached b"), driveModifiedTime: "t2-old" },
			cachedFrom(file("gone", "t0"), "cached gone"),
		];

		const result = await syncReceipts("token", cached);

		const byId = new Map(result.map((r) => [r.id, r]));
		expect([...byId.keys()].sort()).toEqual(["a", "b", "c"]);
		expect(byId.get("a")?.storeName).toBe("cached a");
		expect(byId.get("b")?.storeName).toBe("store b");
		expect(byId.get("b")?.driveModifiedTime).toBe("t2-new");
		expect(byId.get("c")?.fileId).toBe("c");
		expect(drive.contentFetches.sort()).toEqual(["b", "c"]);
	});

	test("keeps at most a handful of content downloads in flight", async () => {
		const files = Array.from({ length: 40 }, (_, i) => file(`f${i}`, "t"));
		const drive = serveDrive(files, 5);

		const result = await syncReceipts("token", []);

		expect(result).toHaveLength(40);
		expect(drive.maxInFlight).toBeGreaterThan(1);
		expect(drive.maxInFlight).toBeLessThanOrEqual(8);
	});
});
