const CACHE_NAME = "mpstme-web-v2";
const STATIC_ASSETS = ["/", "/manifest.webmanifest", "/mpstme-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCoreStatic = isSameOrigin && STATIC_ASSETS.includes(url.pathname);
  const isNextBundle = isSameOrigin && url.pathname.startsWith("/_next/");

  // Never cache cross-origin requests.
  if (!isSameOrigin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for tiny static shell assets only.
  if (isCoreStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
          return response;
        });
      })
    );
    return;
  }

  // Network-first for app bundles and pages to avoid stale JS/env.
  if (isNextBundle || event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match("/"));
      })
  );
});
