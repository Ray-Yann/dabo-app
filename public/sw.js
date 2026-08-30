self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Dabo", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "Dabo", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/app"));
});
