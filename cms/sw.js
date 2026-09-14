/* ═══════════════════════════════════════════════════════════
   SHIVAA v45-MEGA — service worker (offline + speed)
   Cache-first for static assets, network-first for /api/*.
   ═══════════════════════════════════════════════════════════ */
const CACHE = 'shivaa-v45-mega';
const CORE = [
  '/',
  '/index.html',
  '/css/fonts.css', '/css/styles.css', '/css/hallmark.css', '/css/trust.css', '/css/boost.css',
  '/js/app.js', '/js/auth.js', '/js/admin.js', '/js/qr.js', '/js/otp-autofill.js',
  '/js/hallmark.js', '/js/trust.js', '/js/three-d.js', '/js/boost.js', '/js/boost-data.json',
  '/images/logo.png', '/images/favicon.png',
  '/images/banners/hero-main.jpg', '/images/banners/poster-bridal.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;           // always network
  e.respondWith(
    caches.match(e.request).then(hit => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.ok && !url.pathname.startsWith('/images/films/')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});
