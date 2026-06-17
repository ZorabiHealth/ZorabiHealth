self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title || "ZorabiHealth";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/badge.png",
    tag: data.tag || `notif-${Date.now()}`,
    data: data.data || {},
    requireInteraction: true,
    ...(data.category === "medication" && {
      tag: `med-${data.medication_id || Date.now()}`,
    }),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find(
        (client) => client.url.includes("/dashboard") && "focus" in client
      );
      if (matchingClient) {
        return matchingClient.focus();
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
