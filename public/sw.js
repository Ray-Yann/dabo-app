self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
