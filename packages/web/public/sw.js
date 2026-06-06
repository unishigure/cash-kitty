/**
 * Service Worker for Money Note (PWA).
 *
 * Goals:
 *  - Make the app installable and give it a basic offline app-shell.
 *  - NEVER interfere with dynamic/data requests: the runtime config (`/api/*`),
 *    the OCR API, Google OAuth / Drive, etc. always go to the network.
 *
 * Strategy:
 *  - Navigations (HTML)        -> network-first, fall back to cached shell.
 *  - Same-origin static assets -> stale-while-revalidate (hashed JS/CSS/icons).
 *  - Everything else           -> straight to the network (no caching).
 */

const CACHE_VERSION = "money-note-v3";
const SHELL_URL = "/";

// Pre-cache the bare app shell so a cold offline launch still renders.
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_VERSION)
			.then((cache) => cache.addAll([SHELL_URL, "/manifest.webmanifest"]))
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
					const copy = res.clone();
					caches.open(CACHE_VERSION).then((c) => c.put(SHELL_URL, copy));
					return res;
				})
				.catch(() =>
					caches.match(SHELL_URL).then((r) => r ?? caches.match(request)),
				),
		);
		return;
	}

	// Static assets (hashed JS/CSS, icons, manifest): stale-while-revalidate.
	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((res) => {
					if (res?.ok) {
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
