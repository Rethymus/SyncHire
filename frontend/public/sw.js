/**
 * SyncHire Lite service worker — deliberately minimal.
 *
 * Strategy:
 *  - /_next/static/** (immutable, content-hashed): cache-first.
 *  - Everything else: straight to the network. Pages are not cached, so
 *    data freshness is never traded for offline speed, and the local API
 *    on :8000 (cross-origin) is never touched.
 *
 * Registered only in production builds (see components/sw-register.tsx).
 */

const STATIC_CACHE = "synchire-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("synchire-static-") && k !== STATIC_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.includes("/_next/static/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
