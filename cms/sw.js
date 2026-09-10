/* Shivaa service worker — network-first shell cache.
   Never serves stale content while online: the network is always tried
   first and the cache is only a fallback (bad connection / offline).
   GET + same-origin requests only; the API and uploads always go live. */
'use strict';
const SHELL = 'shivaa-shell-v52';
const SHELL_FILES = ['/', '/index.html', '/css/fonts.css?v=42', '/css/styles.css?v=42',
  '/css/hallmark.css?v=42', '/css/trust.css?v=42', '/css/finale.css?v=44', '/css/bot.css?v=52',
  '/js/app.js?v=52', '/js/bot.js?v=52', '/images/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.url.includes('/api/') || r.url.includes('/data/') || r.url.includes('/uploads/')) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res && res.ok) { const c = res.clone(); caches.open(SHELL).then((x) => x.put(r, c)); }
      return res;
    }).catch(() => caches.match(r).then((hit) => hit || caches.match('/index.html')))
  );
});
