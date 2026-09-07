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
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/app"));
});
