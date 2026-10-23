import { expect, test } from "bun:test";
import { formatYenCompact } from "./format";

test("formatYenCompact switches to 万 from ten thousand", () => {
	expect(formatYenCompact(0)).toBe("0");
	expect(formatYenCompact(8500)).toBe("8,500");
	expect(formatYenCompact(12_300)).toBe("1.2万");
	expect(formatYenCompact(20_000)).toBe("2万");
	expect(formatYenCompact(150_000)).toBe("15万");
});
