const cacheName = "cash-kitty-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== cacheName)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return caches.match("/");
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const fetched = fetch(event.request).then((response) => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  });
  if (!cached) return fetched;
  event.waitUntil(fetched.catch(() => {}));
  return cached;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    request.mode === "navigate"
      ? networkFirstPage(request)
      : staleWhileRevalidate(event),
  );
});
