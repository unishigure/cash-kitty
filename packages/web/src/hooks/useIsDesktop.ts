import { useSyncExternalStore } from "react";

// Tailwind's `lg` breakpoint, so JS-driven behavior switches with the `lg:` classes.
const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
	const mq = window.matchMedia(QUERY);
	mq.addEventListener("change", onChange);
	return () => mq.removeEventListener("change", onChange);
}

export function useIsDesktop(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(QUERY).matches,
	);
}
