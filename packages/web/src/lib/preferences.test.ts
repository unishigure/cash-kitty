import { describe, expect, test } from "bun:test";
import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences";

describe("parsePreferences", () => {
	test("keeps known categories in category order and drops the rest", () => {
		expect(
			parsePreferences({
				fixedCategories: ["通信", "家賃", "住居費", 3, "通信"],
			}),
		).toEqual({ fixedCategories: ["住居費", "通信"] });
	});

	test("falls back to the defaults for anything that is not a preferences object", () => {
		for (const raw of [
			null,
			undefined,
			"x",
			[],
			{},
			{ fixedCategories: "通信" },
		]) {
			expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
		}
	});
});
