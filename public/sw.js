const CACHE_NAME = "controlcenter-offline-v1";

// List of static root resources to cache immediately during service worker install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/icon_pwa.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first falling back to network with dynamic runtime caching
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and exclude any external APIs, hot reloads, or other protocols like chrome-extension
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, but fetch and update cache in background (Stale While Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Ignore background update mistakes */ });
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache dynamically
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for navigation (HTML document), serve the cached root
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
