/** Generate a unique id, with a fallback for non-secure contexts (LAN HTTP). */
export function newId(): string {
	const c = globalThis.crypto;
	if (c && "randomUUID" in c) return c.randomUUID();
	return (
		Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
	);
}
