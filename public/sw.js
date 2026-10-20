const CACHE = 'travel-experiences-__BUILD_ID__';
const APP_FILES = __PRECACHE_URLS__;
const scope = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES.map((file) => new URL(file, scope).href))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('travel-experiences-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(scope)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, response.clone())));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(scope)) || Response.error()));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, response.clone())));
    return response;
  })));
});



// --- Konfigurasi Push Notification Interaktif dengan Ikon Bergaya FontAwesome ---
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'LembarTransfer';
  
  // Menggunakan ikon SVG bersih bergaya FontAwesome (fa-phone-slash & fa-phone)
  const rejectIconSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="%23ea0038"><path d="M623.2 414.5l-95.2-95.2c-15.5-15.5-40.8-15.5-56.3 0l-50.7 50.7c-72.3-37.4-131.5-96.6-168.9-168.9l50.7-50.7c15.5-15.5 15.5-40.8 0-56.3L110.3 16.8c-15.5-15.5-40.8-15.5-56.3 0L19.2 51.6C7.2 63.6 1.4 80.1 .3 96.8c-2.4 38.6 3.9 77.3 18.2 113.8 45.4 116.1 133.2 203.9 249.3 249.3 36.5 14.3 75.2 20.6 113.8 18.2 16.7-1.1 33.2-6.9 45.2-18.9l34.8-34.8c15.5-15.5 15.5-40.8 0-56.3z"/></svg>';
  const answerIconSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="%2300a884"><path d="M164.7 24.8c-7.7-16.5-25.4-25.8-43.5-22l-96 20C9.3 26.6-.5 39.5 0 53.2c4.4 121.5 53.4 235.5 137.2 319.3s197.8 132.8 319.3 137.2c13.7 .5 26.6-9.3 30.4-25.2l20-96c3.8-18.1-5.5-35.8-22-43.5l-84-37.5c-15.4-6.9-33.3-1.6-43.2 12.5l-26 37.6c-52.6-26.2-95.8-69.4-122-122l37.6-26c14.1-9.9 19.4-27.8 12.5-43.2l-37.5-84z"/></svg>';

  const options = {
    body: data.body || 'Telepon suara masuk...',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'incoming-call',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'reject-call', title: 'Tolak', icon: rejectIconSvg },
      { action: 'answer-call', title: 'Jawab', icon: answerIconSvg }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'answer-call') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('/');
      })
    );
  } else if (event.action === 'reject-call') {
    console.log('Panggilan ditolak.');
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});
