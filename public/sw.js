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
      icon: './icons/logo-192.png',
      badge: './icons/logo-badge-96.png',
      data: { url: payload.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || './';
  // Las URLs relativas se resuelven contra el scope (/bus-in-live/).
  // La Edge Function manda rutas de la app como '/rutas/ID': se interpretan DENTRO del scope
  // (/bus-in-live/), no en la raíz del dominio (que daría 404 en GitHub Pages).
  const relative = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl.slice(1) : rawUrl;
  let targetUrl = new URL(relative, self.registration.scope);
  if (targetUrl.origin !== self.location.origin) targetUrl = new URL(self.registration.scope);
  targetUrl = targetUrl.toString();

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
