/* ΜΠΙΛΙΑΡΔΟ PRO — Service Worker (offline cache) */
const CACHE = 'biliardo-pro-v16';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=16',
  './data.js?v=16',
  './game.js?v=16',
  './app.js?v=16',
  './manifest.webmanifest',
  './icon-192.png?v=2',
  './icon-512.png?v=2',
  './icon-512-maskable.png?v=2',
  './apple-touch-180.png?v=2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML/navigation: network-first (πάντα φρέσκο) · assets: cache-first (γρήγορο/offline)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  const isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
