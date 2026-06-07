/**
 * Static preview server for the built site (`dist/`).
 *
 * Serves exactly what a static host would: the SPA at `/`, hashed JS/CSS, and
 * the PWA files — no API, no proxy, no on-the-fly bundling. `bun run start`
 * builds first, then runs this. Use it to verify the production bundle and the
 * installable PWA locally.
 *
 * Note: there is no `/api` here (a real deploy routes that to the API via the
 * gateway), so OCR won't work under `bun start` — use `bun dev` for OCR work.
 */
import { join, normalize } from "node:path";
import { serve } from "bun";

const DIST = join(import.meta.dir, "dist");
const INDEX = join(DIST, "index.html");

if (!(await Bun.file(INDEX).exists())) {
	console.error("dist/ not found — run `bun run build` first.");
	process.exit(1);
}

/**
 * Mirror the static security headers a real host applies via public/_headers.
 * HSTS and the build-time CSP are intentionally omitted here — HSTS is
 * https-only (this preview is plain http) and the CSP is generated into
 * dist/_headers by build.ts, which this preview server does not read.
 */
function applySecurityHeaders(res: Response): Response {
	res.headers.set("X-Content-Type-Options", "nosniff");
	res.headers.set("X-Frame-Options", "DENY");
	res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
	res.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	);
	return res;
}

/** Set content type / caching for files Bun doesn't infer or that must revalidate. */
function withHeaders(path: string, res: Response): Response {
	if (path.endsWith(".webmanifest")) {
		res.headers.set("content-type", "application/manifest+json; charset=utf-8");
		// Stable-named PWA file may be swapped in place; always revalidate.
		res.headers.set("cache-control", "no-cache");
	}
	return applySecurityHeaders(res);
}

const server = serve({
	// Listen on all interfaces so phones on the same LAN can reach it.
	hostname: "0.0.0.0",
	port: Number(process.env.PORT ?? 3000),
	async fetch(req) {
		const url = new URL(req.url);
		const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
		// join + normalize collapses any `..`; the startsWith check blocks escapes.
		const path = rel ? normalize(join(DIST, rel)) : INDEX;
		const file = Bun.file(path);
		if (path.startsWith(DIST) && (await file.exists())) {
			return withHeaders(path, new Response(file));
		}
		// SPA fallback for navigations; 404 for missing assets / unknown /api.
		if (
			req.method === "GET" &&
			req.headers.get("accept")?.includes("text/html")
		) {
			return applySecurityHeaders(
				new Response(Bun.file(INDEX), {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
			);
		}
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`🚀 Serving dist/ (static) on http://localhost:${server.port}/`);
