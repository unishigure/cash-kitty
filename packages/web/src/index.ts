import path from "node:path";
import { serve } from "bun";
import index from "./index.html";

// Static PWA assets (manifest, service worker, icons) live in ../public and are
// served from the site root so the service worker scope covers the whole SPA.
const PUBLIC_DIR = path.join(import.meta.dir, "..", "public");

/** Serve a file from ../public, optionally overriding the content type. */
function servePublic(file: string, contentType?: string): Response {
	const f = Bun.file(path.join(PUBLIC_DIR, file));
	const headers = new Headers();
	if (contentType) headers.set("content-type", contentType);
	// These assets have stable filenames (sw.js, manifest, icons) and may be
	// swapped in place, so tell the browser to always revalidate rather than
	// serve a stale cached copy. (ETag still yields 304s when unchanged.)
	headers.set("cache-control", "no-cache");
	return new Response(f, { headers });
}

// Upstream OCR API (FastAPI). The browser never talks to it directly — we proxy
// it below so the SPA always uses its own (same) origin. This avoids mixed-content
// blocking when the SPA is served over HTTPS, and CORS entirely.
const OCR_UPSTREAM = (
	process.env.OCR_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** Forward a request to the OCR upstream and stream the response back. */
async function proxyToOcr(req: Request, path: string): Promise<Response> {
	const target = `${OCR_UPSTREAM}${path}`;
	const init: RequestInit = { method: req.method };
	if (req.method !== "GET" && req.method !== "HEAD") {
		init.body = await req.arrayBuffer();
		const ct = req.headers.get("content-type");
		if (ct) init.headers = { "content-type": ct };
	}
	try {
		const res = await fetch(target, init);
		const headers = new Headers();
		const ct = res.headers.get("content-type");
		if (ct) headers.set("content-type", ct);
		return new Response(res.body, { status: res.status, headers });
	} catch {
		return Response.json(
			{
				success: false,
				code: "OCR_UPSTREAM_UNREACHABLE",
				message: `OCR API に接続できませんでした (${target})。OCR サーバーが起動しているか確認してください。`,
			},
			{ status: 502 },
		);
	}
}

const server = serve({
	// Listen on all interfaces so phones on the same LAN can reach the dev server.
	hostname: "0.0.0.0",
	port: Number(process.env.PORT ?? 3000),
	routes: {
		// Expose server-side config (read from .env) to the SPA.
		"/api/config": {
			GET() {
				return Response.json({
					googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
				});
			},
		},

		// Proxy the OCR API so the SPA stays same-origin (works over HTTPS, no CORS).
		"/api/ocr/analyze": { POST: (req) => proxyToOcr(req, "/api/ocr/analyze") },
		"/api/health": { GET: (req) => proxyToOcr(req, "/api/health") },

		// PWA static assets (served from ../public at the site root).
		"/manifest.webmanifest": () =>
			servePublic(
				"manifest.webmanifest",
				"application/manifest+json; charset=utf-8",
			),
		"/sw.js": () => servePublic("sw.js", "text/javascript; charset=utf-8"),
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
console.log(`🚀 Money Note web running (listening on 0.0.0.0:${port})`);
console.log(`   このPCから:   http://localhost:${port}/`);
console.log(
	`   公開URL:      Cloudflare Tunnel 経由 (cloudflared tunnel run ...)`,
);
console.log(`   OCR upstream: ${OCR_UPSTREAM}`);
