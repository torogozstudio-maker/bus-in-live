// bus-in-live · Service Worker: Web Push + notificaciones
// Se sirve desde /bus-in-live/sw.js (GitHub Pages), scope /bus-in-live/.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'bus-in-live', body: '', url: './' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || '',
        url: parsed.url || './'
      };
    }
  } catch (e) {
    // Payload sin JSON válido: se muestra con valores por defecto, no se inventa contenido.
    payload.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.svg',
      badge: './icons/icon-192.svg',
      data: { url: payload.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || './';
  // Las URLs relativas se resuelven contra el scope (/bus-in-live/).
  const targetUrl = new URL(rawUrl, self.registration.scope).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
