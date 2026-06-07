/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const elem = document.getElementById("root");
if (!elem) throw new Error("Root element #root not found");

const app = (
	<StrictMode>
		<App />
	</StrictMode>
);

// In dev (`bun --hot`) reuse the root across HMR updates so state survives
// reloads. In production (`bun start`) `import.meta.hot` is undefined, so create
// the root directly — otherwise accessing `.data` throws and nothing renders.
if (import.meta.hot) {
	import.meta.hot.data.root ??= createRoot(elem);
	import.meta.hot.data.root.render(app);
} else {
	createRoot(elem).render(app);
}

// The app used to ship a service worker (PWA offline app-shell). It was dropped
// because the app is useless offline anyway — OCR and Google Drive both require
// the network. Actively tear down any SW + caches a previous version installed,
// so returning users stop running the stale worker. Safe to run unconditionally:
// there is nothing to unregister on a fresh install or in dev.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.getRegistrations()
			.then((regs) => Promise.all(regs.map((r) => r.unregister())))
			.catch(() => {});
		if ("caches" in window) {
			caches
				.keys()
				.then((keys) =>
					Promise.all(
						keys
							.filter((k) => k.startsWith("cash-kitty-"))
							.map((k) => caches.delete(k)),
					),
				)
				.catch(() => {});
		}
	});
}
