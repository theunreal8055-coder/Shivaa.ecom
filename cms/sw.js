/* Shivaa service worker — network-first shell + bounded media cache.
   Never serves stale code while online: the network is always tried first
   for the shell; images get a capped cache-first store for fast repeat
   visits on slow phones; videos/API/uploads always go to the network.
   v103: media moved into its own quota-aware cache (the v102 single cache
   grew without limit and would eventually exhaust storage on cheap devices).
   v104: shell/media bumped; a SKIP_WAITING message lets the in-app banner
   activate a freshly downloaded release the moment the shopper approves.
 v113b: the precache list finally matches index.html — it had been pinning
 app.js?v=108 and auth.js?v=107 (v108.js/v109.js are not loaded by the page
 at all) and was missing boost.css/boost.js and the whole v113 layer, so a
 returning phone kept a stale shell on its first paint. The offline fallback
 also stopped answering a missing IMAGE with index.html.
 v115: shell bumped again for the categories-back release (app.js?v=115 +
 the v115 css layer). index.html now also stamps window.__SHIVAA_REL, and
 app.js reloads itself once if the paired script is older than the shell it
 was served — a device can no longer run a fresh shell on a stale script. */
'use strict';
const SHELL = 'shivaa-shell-v120';
/* v120 — MEDIA generation bump: purges pre-v113 poisoned entries (category faces
   that 404'd into the SPA fallback were cached AS images for 30 days) and any
   other stale art. Old caches auto-delete on activate; phones re-fetch once. */
const MEDIA = 'shivaa-media-v120';
const MEDIA_MAX = 60;          // ~60 product photos kept on the phone
const MEDIA_TTL = 1000 * 60 * 60 * 24 * 30;   // 30 days
/* v99: bot.css/bot.js dropped from the shell (Saathi removed ahead of Gemini).
   admin.js + qr.js are deliberately NOT precached — they are fetched on demand
   by loadStaffBundle() in app.js, and a shopper should never pay for them. */
/* v107 — the list matches index.html exactly.
   v116 — categories fix, carousel fix, quick view fix, payment fix layer added.
   v117 — the "butter" release: the base64 webfont stylesheet (354 KB) became
   3 real woff2 files (all precached below); the route-scoped and JS-gated
   stylesheets still cache here even though index.html now loads them with
   the non-blocking preload-swap pattern; aurum/motion/boost.js stay
   precached too — v117.js injects them post-paint, and a warm precache makes
   that injection instant and offline-safe. */
const SHELL_FILES = ['/', '/index.html',
  '/css/fonts.css?v=117', '/css/styles.css?v=107', '/css/hallmark.css?v=107',
  '/css/trust.css?v=107', '/css/finale.css?v=107', '/css/motion.css?v=107',
  '/css/mobile.css?v=107', '/css/aurum.css?v=107', '/css/v107.css?v=107',
  '/css/boost.css?v=46', '/css/v113.css?v=113b', '/css/v115.css?v=115',
  '/css/v116.css?v=116', '/css/v117.css?v=117', '/css/v118.css?v=118', '/css/v119.css?v=119', '/css/v120.css?v=120', '/css/v121.css?v=121',
  '/js/otp-autofill.js?v=107', '/js/app.js?v=120', '/js/hallmark.js?v=107',
  '/js/trust.js?v=107', '/js/auth.js?v=113b', '/js/motion.js?v=107',
  '/js/aurum.js?v=107', '/js/v107.js?v=107', '/js/boost.js?v=46',
  '/js/v116.js?v=120', '/js/v117.js?v=117', '/js/v118.js?v=118', '/js/v119.js?v=119', '/js/v120.js?v=120',
  '/fonts/jost.woff2', '/fonts/cormorant-garamond.woff2', '/fonts/marcellus-400.woff2',
  '/manifest.webmanifest', '/offline.html',
  '/images/icons/icon-192.png', '/images/icons/icon-512.png',
  '/images/icons/icon-maskable-512.png', '/images/icons/apple-touch-icon.png'];

self.addEventListener('message', (e) => {
  // v107 — accept both the legacy string and the {type} object form
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});
self.addEventListener('install', (e) => {
  /* v107 — per-file precache. addAll() is all-or-nothing: one 404 in the list
     (which is exactly what the missing icon was) zeroed the WHOLE shell cache
     and .catch(()=>{}) hid it. Now each file is fetched and stored on its own;
     a single failure degrades to network-first for that one file. */
  e.waitUntil(caches.open(SHELL).then((c) => Promise.allSettled(SHELL_FILES.map((u) =>
    fetch(u, { cache: 'reload', credentials: 'same-origin' })
      .then((r) => { if (r && r.ok) return c.put(u, r); })
      .catch(() => {})
  ))).then(() => self.skipWaiting()));
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
    }).catch(() => caches.match(r).then((hit) => {
      if (hit) return hit;
      /* v113b - only a navigation may fall back to the app shell. A missing
         image used to be answered with index.html (an HTML body for an <img>),
         which the browser reports as a broken image and the console logs as a
         MIME error; a failed API call must fail loudly, never render. */
      if (u.pathname.startsWith('/api/')) return Response.error();
      const wantsDoc = r.mode === 'navigate' || (r.headers.get('accept') || '').indexOf('text/html') >= 0;
      return wantsDoc ? caches.match('/index.html') : Response.error();
    }))
  );
});
