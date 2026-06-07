import path from "node:path";
import { serve } from "bun";
import index from "./index.html";

// Static PWA assets (manifest, icons) live in ../public and are served from the
// site root.
const PUBLIC_DIR = path.join(import.meta.dir, "..", "public");

/** Serve a file from ../public, optionally overriding the content type. */
function servePublic(file: string, contentType?: string): Response {
	const f = Bun.file(path.join(PUBLIC_DIR, file));
	const headers = new Headers();
	if (contentType) headers.set("content-type", contentType);
	// These assets have stable filenames (manifest, icons) and may be swapped in
	// place, so tell the browser to always revalidate rather than serve a stale
	// cached copy. (ETag still yields 304s when unchanged.)
	headers.set("cache-control", "no-cache");
	return new Response(f, { headers });
}

const server = serve({
	// Listen on all interfaces so phones on the same LAN can reach the dev server.
	hostname: "0.0.0.0",
	port: Number(process.env.PORT ?? 3000),
	routes: {
		// PWA static assets (served from ../public at the site root).
		"/manifest.webmanifest": () =>
			servePublic(
				"manifest.webmanifest",
				"application/manifest+json; charset=utf-8",
			),
		"/icon-192.png": () => servePublic("icon-192.png", "image/png"),
		"/icon-512.png": () => servePublic("icon-512.png", "image/png"),
		"/icon-maskable-512.png": () =>
			servePublic("icon-maskable-512.png", "image/png"),
		"/apple-touch-icon.png": () =>
			servePublic("apple-touch-icon.png", "image/png"),
		"/favicon-32.png": () => servePublic("favicon-32.png", "image/png"),

		// Serve the SPA for all routes.
		"/*": index,
	},

	development: process.env.NODE_ENV !== "production" && {
		// Enable browser hot reloading in development
		hmr: true,
		// Echo console logs from the browser to the server
		console: true,
	},
});

const port = server.port;
console.log(`🚀 Cash Kitty web running (listening on 0.0.0.0:${port})`);
console.log(`   このPCから:   http://localhost:${port}/`);
console.log(
	`   公開URL:      Cloudflare Tunnel 経由 (cloudflared tunnel run ...)`,
);
