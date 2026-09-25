const DABO_SW_VERSION = "pwa-v2-shopping-offline-20260924";
const DABO_OFFLINE_CACHE = "dabo-shopping-offline-v1";

const DABO_OFFLINE_ROUTES = [
  "/app",
  "/app/courses",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(DABO_OFFLINE_CACHE)
      .then((cache) => cache.addAll(DABO_OFFLINE_ROUTES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("dabo-shopping-offline-") &&
                cacheName !== DABO_OFFLINE_CACHE
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  const isNextStaticAsset = url.pathname.startsWith("/_next/static/");

  if (isNextStaticAsset) {
    event.respondWith(
      caches.open(DABO_OFFLINE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);

        if (response && response.ok) {
          await cache.put(event.request, response.clone());
        }

        return response;
      })
    );
    return;
  }

  if (event.request.mode !== "navigate") return;

  const isOfflineShoppingRoute =
    url.pathname === "/" ||
    url.pathname === "/app" ||
    url.pathname === "/app/courses";

  if (!isOfflineShoppingRoute) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches
              .open(DABO_OFFLINE_CACHE)
              .then((cache) => cache.put(event.request, copy))
          );
        }

        return response;
      })
      .catch(async () => {
        const exactMatch = await caches.match(event.request);
        if (exactMatch) return exactMatch;

        const coursesFallback = await caches.match("/app/courses");
        if (coursesFallback) return coursesFallback;

        return caches.match("/app");
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "DABO_SW_VERSION") {
    event.source?.postMessage({ type: "DABO_SW_VERSION", version: DABO_SW_VERSION });
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Dabo", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "Dabo", {
      body: data.body || "",
      icon: "/dabo-equilibre-v3-192.png",
      badge: "/dabo-equilibre-v3-192.png",
      data: { url: data.url || "/app" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/app";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const absoluteTarget = new URL(target, self.location.origin).href;
      for (const client of windowClients) {
        if (client.url === absoluteTarget && "focus" in client) return client.focus();
      }
      return clients.openWindow(target);
    })
  );
});
