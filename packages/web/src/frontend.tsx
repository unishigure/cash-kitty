/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { consumeAuthRedirect } from "./lib/googleAuth";

// If we are returning from a Google OAuth redirect, store the token (or the
// error) carried in the URL fragment *before* React renders, so initial state
// already sees it and the token never lingers in the address bar.
consumeAuthRedirect();

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
