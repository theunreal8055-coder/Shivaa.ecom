/* Shivaa service worker — network-first shell cache.
   Never serves stale content while online: the network is always tried
   first and the cache is only a fallback (bad connection / offline).
   GET + same-origin requests only; the API and uploads always go live. */
'use strict';
const SHELL = 'shivaa-shell-v56';
const SHELL_FILES = ['/', '/index.html', '/css/fonts.css?v=42', '/css/styles.css?v=56',
  '/css/hallmark.css?v=42', '/css/trust.css?v=42', '/css/finale.css?v=44', '/css/bot.css?v=56',
  '/js/app.js?v=56', '/js/bot.js?v=56', '/images/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const u = new URL(r.url);
  const offlineApi = u.pathname === '/api/products' || u.pathname === '/api/rates';  // v55: offline catalogue
  if (!offlineApi && (u.pathname.startsWith('/api/') || u.pathname.startsWith('/data/') || u.pathname.startsWith('/uploads/'))) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res && res.ok) { const c = res.clone(); caches.open(SHELL).then((x) => x.put(r, c)); }
      return res;
    }).catch(() => caches.match(r).then((hit) => hit || (u.pathname.startsWith('/api/') ? Response.error() : caches.match('/index.html'))))
  );
});