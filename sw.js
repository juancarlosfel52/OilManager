// OilManager Service Worker — keeps the PWA alive for background GPS
const CACHE = 'oilmanager-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/dashboard-worker.html',
      '/manifest.json'
    ]).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Network-first for API calls, cache-first for assets
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // never cache API
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
