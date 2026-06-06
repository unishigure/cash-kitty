/**
 * Service Worker for Cash Kitty (PWA).
 *
 * Goals:
 *  - Make the app installable and give it a basic offline app-shell.
 *  - NEVER interfere with dynamic/data requests: the runtime config (`/api/*`),
 *    the OCR API, Google OAuth / Drive, etc. always go to the network.
 *  - NEVER serve a stale shell that points at hashed assets which no longer
 *    exist on the server (the classic post-deploy "white screen").
 *
 * Strategy:
 *  - Navigations (HTML)        -> network-first, fall back to cached shell.
 *  - Same-origin static assets -> stale-while-revalidate (hashed JS/CSS/icons).
 *  - Everything else           -> straight to the network (no caching).
 *
 * Cache busting:
 *  `BUILD_VERSION` and `PRECACHE_URLS` are rewritten by `build.ts` at build time
 *  (see the `injectServiceWorkerVersion` step). Because the cache name embeds the
 *  build hash, every deploy installs a fresh cache and `activate` deletes all
 *  previous ones — so the shell and the hashed assets it references can never
 *  drift out of sync. The literal defaults below are only used in the unbuilt
 *  `public/sw.js` (dev), where the SW is never actually registered.
 */

const BUILD_VERSION = "__BUILD_VERSION__";
const CACHE_VERSION = `cash-kitty-${BUILD_VERSION}`;
const SHELL_URL = "/";

// build.ts replaces the next line with the full hashed-asset list for this build.
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

// Pre-cache the app shell *and* the hashed assets it references, so a cold
// offline launch (e.g. opening the installed PWA with no network) renders the
// exact, self-consistent build instead of a blank page.
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			// `{ cache: "reload" }` bypasses the HTTP cache so install always
			// pulls the freshly deployed bytes, never a stale browser-cached copy.
			.then((cache) =>
				cache.addAll(
					PRECACHE_URLS.map((u) => new Request(u, { cache: "reload" })),
				),
			)
			.then(() => self.skipWaiting()),
	);
});

// Drop caches from previous versions and take control immediately.
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// A response is only safe to cache as our shell/asset if it actually succeeded
// and came from our own origin (not an opaque cross-origin or proxy error page).
function isCacheableResponse(res) {
	return Boolean(res) && res.ok && res.type === "basic";
}

self.addEventListener("fetch", (event) => {
	const { request } = event;

	// Only ever touch GET; let the browser handle the rest normally.
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	// Cross-origin (Google APIs, gstatic, OCR upstream when called directly, …):
	// never intercept — go straight to the network.
	if (url.origin !== self.location.origin) return;

	// Dynamic endpoints must always hit the network (never cache data/config).
	if (url.pathname.startsWith("/api/")) return;

	// App navigations: network-first so updates land immediately, with the
	// cached shell as an offline fallback.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((res) => {
					// Only persist genuine, successful HTML — never cache an error
					// page or redirect as the shell (that would stick a white screen).
					if (isCacheableResponse(res)) {
						const copy = res.clone();
						caches.open(CACHE_VERSION).then((c) => c.put(SHELL_URL, copy));
					}
					return res;
				})
				.catch(async () => {
					const cached =
						(await caches.match(SHELL_URL)) ?? (await caches.match(request));
					if (cached) return cached;
					// No network and nothing cached: return a minimal, honest page
					// instead of a blank screen so the user can retry.
					return new Response(
						"<!doctype html><meta charset=utf-8><title>オフライン</title>" +
							"<body style='font-family:sans-serif;padding:2rem'>" +
							"<p>オフラインのため読み込めませんでした。</p>" +
							"<button onclick='location.reload()'>再読み込み</button>",
						{ headers: { "Content-Type": "text/html; charset=utf-8" } },
					);
				}),
		);
		return;
	}

	// Static assets (hashed JS/CSS, icons, manifest): stale-while-revalidate.
	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((res) => {
					if (isCacheableResponse(res)) {
						const copy = res.clone();
						caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
					}
					return res;
				})
				.catch(() => cached);
			return cached ?? network;
		}),
	);
});
