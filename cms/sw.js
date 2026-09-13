/* Shivaa service worker — network-first shell + bounded media cache.
   Never serves stale code while online: the network is always tried first
   for the shell; images get a capped cache-first store for fast repeat
   visits on slow phones; videos/API/uploads always go to the network.
   v103: media moved into its own quota-aware cache (the v102 single cache
   grew without limit and would eventually exhaust storage on cheap devices). */
'use strict';
const SHELL = 'shivaa-shell-v103';
const MEDIA = 'shivaa-media-v103';
const MEDIA_MAX = 60;          // ~60 product photos kept on the phone
const MEDIA_TTL = 1000 * 60 * 60 * 24 * 30;   // 30 days
/* v99: bot.css/bot.js dropped from the shell (Saathi removed ahead of Gemini).
   admin.js + qr.js are deliberately NOT precached — they are fetched on demand
   by loadStaffBundle() in app.js, and a shopper should never pay for them. */
const SHELL_FILES = ['/', '/index.html', '/css/fonts.css?v=42', '/css/styles.css?v=99',
  '/css/hallmark.css?v=42', '/css/trust.css?v=42', '/css/finale.css?v=44',
  '/css/motion.css?v=99', '/css/mobile.css?v=99', '/css/aurum.css?v=103',
  '/js/app.js?v=103', '/js/motion.js?v=103', '/js/aurum.js?v=100',
  '/js/hallmark.js?v=103', '/js/trust.js?v=103', '/images/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

/* Cap the media cache: drop the oldest entries past MEDIA_MAX. */
async function trimMedia() {
  const c = await caches.open(MEDIA);
  const keys = await c.keys();
  if (keys.length <= MEDIA_MAX) return;
  for (let i = 0; i < keys.length - MEDIA_MAX; i++) await c.delete(keys[i]);
}
function isImage(u) {
  return /\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:\?|$)/i.test(u.pathname);
}

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const u = new URL(r.url);
  const offlineApi = u.pathname === '/api/products' || u.pathname === '/api/rates';  // v55: offline catalogue

  // Films (142 MB library) never touch the cache — always streamed live.
  if (/\.(?:mp4|webm|mov|m4v)(?:\?|$)/i.test(u.pathname)) return;

  // v103 — cache-first for product photos, background-refresh; cached photo
  // shows instantly on 2G/3G and the freshest copy is revalidated silently.
  if (isImage(u) && !u.pathname.startsWith('/uploads/reviews/')) {
    e.respondWith((async () => {
      const mediaCache = await caches.open(MEDIA);
      const hit = await mediaCache.match(r);
      const fetchAndCache = fetch(r).then(async (res) => {
        if (res && res.ok) { mediaCache.put(r, res.clone()).then(trimMedia); }
        return res;
      }).catch(() => null);
      if (hit) { fetchAndCache.catch(() => {}); return hit; }   // stale-while-revalidate
      return (await fetchAndCache) || Response.error();
    })());
    return;
  }

  if (!offlineApi && (u.pathname.startsWith('/api/') || u.pathname.startsWith('/data/') || u.pathname.startsWith('/uploads/'))) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res && res.ok) { const c = res.clone(); caches.open(SHELL).then((x) => x.put(r, c)); }
      return res;
    }).catch(() => caches.match(r).then((hit) => hit || (u.pathname.startsWith('/api/') ? Response.error() : caches.match('/index.html'))))
  );
});
