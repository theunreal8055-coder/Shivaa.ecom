/* Shivaa service worker — network-first shell + bounded media cache.
   Never serves stale code while online: the network is always tried first
   for the shell; images get a capped cache-first store for fast repeat
   visits on slow phones; videos/API/private uploads always go to the network.
   v168: scope caches to Shivaa only, reject stale/HTML media, track background
   writes with waitUntil, and never store private documents or API responses.
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
 was served — a device can no longer run a fresh shell on a stale script.
 v166 · ALWAYS THE LATEST: every asset URL was re-stamped to ?v=<REL>. The
 untouched files had been left at their old numbers (styles.css was still
 ?v=107) while .htaccess serves any ?v= URL as immutable for a YEAR — so a
 device that visited weeks ago kept the old design and the old scripts, which
 is the owner's "people still see the 15-day-old version". New stamps are URLs
 no device has ever cached. This worker also announces its release to every
 open tab on activate (SHV_RELEASE) and honours a page asking it to drop every
 cache before re-entering on the newest release (SHV_PURGE).
 v177: shell re-stamped for the v176-defect rework (scope-honest purge
 preview, crash-proof stats, ledger-true day book). No new assets, no media
 change — the MEDIA generation below deliberately stays at its own number.
 v178: shell re-stamped for the in-footer app band — the PWA install
 nudge (no store, no APK): new assets css/v178.css + js/v178.js, pre-cached.
 The band itself is plain footer HTML; this worker only keeps it fresh.
 The MEDIA generation below stays put.
 v179: bullion rates — the permanent fix. No new shell assets (the relay
 runs on its own host, not the site); the api changes are: the
 MCX-over-spot premium is now auto-learned while both feeds are live, and
 when MCX is down the site prices from spot × that premium (honest
 'mcx-est' label) instead of raw spot; last-good MCX persists; /api/rates
 carries a `health` object; relay pull health lands in a throttled side
 file. */
'use strict';
const SHELL = 'shivaa-shell-v187';
/* v166 — the release this worker belongs to. It is announced to every open tab
   the moment the new worker activates, so a page that is running an older
   release can move itself to the newest one (js/v166.js, "always the latest").
   Keep in lockstep with window.__SHIVAA_REL and APP_REL. */
const REL = 187;
/* v120 — MEDIA generation bump: purges pre-v113 poisoned entries (category faces
   that 404'd into the SPA fallback were cached AS images for 30 days) and any
   other stale art. Old caches auto-delete on activate; phones re-fetch once. */
const MEDIA = 'shivaa-media-v168';
const ownedCache = name => /^shivaa-(?:shell|media)-v/.test(name);
const MEDIA_MAX = 60;          // ~60 product photos kept on the phone
const MEDIA_TTL = 1000 * 60 * 60 * 24 * 30;   // 30 days; v168 also checks before returning a cache hit
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
  '/css/fonts.css?v=187', '/css/styles.css?v=187', '/css/hallmark.css?v=187',
  '/css/trust.css?v=187', '/css/finale.css?v=187', '/css/motion.css?v=187',
  '/css/mobile.css?v=187', '/css/aurum.css?v=187', '/css/v107.css?v=187',
  '/css/boost.css?v=187', '/css/v113.css?v=187', '/css/v115.css?v=187',
  '/css/v116.css?v=187', '/css/v117.css?v=187', '/css/v118.css?v=187', '/css/v119.css?v=187', '/css/v120.css?v=187', '/css/v121.css?v=187', '/css/v122.css?v=187', '/css/v125.css?v=187', '/css/v139.css?v=187', '/css/v140.css?v=187', '/css/v167.css?v=187', '/css/v174.css?v=187', '/css/v175.css?v=187',
  '/css/v178.css?v=187',
  '/css/v183.css?v=187',
  '/css/v186.css?v=187',
  '/js/otp-autofill.js?v=187', '/js/app.js?v=187', '/js/hallmark.js?v=187',
  '/js/trust.js?v=187', '/js/auth.js?v=187', '/js/motion.js?v=187',
  '/js/aurum.js?v=187', '/js/v107.js?v=187', '/js/boost.js?v=187',
  '/js/v116.js?v=187', '/js/v117.js?v=187', '/js/v118.js?v=187', '/js/v119.js?v=187', '/js/v120.js?v=187', '/js/v122.js?v=187', '/js/v125.js?v=187', '/js/v127.js?v=187', '/js/v139.js?v=187', '/js/v140.js?v=187', '/js/v166.js?v=187', '/js/v167.js?v=187',
  '/js/v178.js?v=187',
  '/fonts/jost.woff2?v=187', '/fonts/cormorant-garamond.woff2?v=187', '/fonts/marcellus-400.woff2?v=187',
  '/manifest.webmanifest', '/offline.html',
  '/images/icons/icon-192.png', '/images/icons/icon-512.png',
  '/images/icons/icon-maskable-512.png', '/images/icons/apple-touch-icon.png'];

self.addEventListener('message', (e) => {
  // v107 — accept both the legacy string and the {type} object form
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
  /* v166 — the page may ask this worker to drop every byte it holds before it
     re-enters the site on a newer release ("always the latest"). Deleting
     caches is safe at any time: the shell is network-first, so the next fetch
     simply goes to the server. */
  if (e.data && e.data.type === 'SHV_PURGE') {
    e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter(ownedCache).map((k) => caches.delete(k))))
      .then(() => { if (e.source && e.source.postMessage) e.source.postMessage({ type: 'SHV_PURGED', rel: REL }); })
      .catch(() => {}));
  }
  if (e.data && e.data.type === 'SHV_WHOAMI') {
    const reply = (e.source && e.source.postMessage) ? e.source.postMessage.bind(e.source) : null;
    if (reply) reply({ type: 'SHV_RELEASE', rel: REL, shell: SHELL });
  }
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
    ks.filter((k) => ownedCache(k) && k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()).then(() => {
    /* v166 — announce the new release to every open tab. A page that is still
       running an older release can then move itself to this one instead of
       waiting for the shopper to notice (js/v166.js handles the message). */
    return self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((cs) => {
      cs.forEach((c) => { try { c.postMessage({ type: 'SHV_RELEASE', rel: REL, shell: SHELL }); } catch (_) {} });
    });
  }));
});

/* Cap the media cache: drop the oldest entries past MEDIA_MAX, and (v167)
   expire anything past MEDIA_TTL. MEDIA_TTL was declared in the v120 layer and
   read nowhere, so a photo replaced at the same URL kept its old bytes on every
   phone that had already seen it — the cache was trimmed for COUNT, never for
   AGE. Prefer the local insertion timestamp, falling back to the HTTP Date
   only for older entries; revalidated HTTP bodies may retain an old Date. */
async function trimMedia() {
  const c = await caches.open(MEDIA);
  const keys = await c.keys();
  for (let i = 0; i < Math.max(0, keys.length - MEDIA_MAX); i++) await c.delete(keys[i]);
  const cutoff = Date.now() - MEDIA_TTL;
  for (const k of await c.keys()) {
    try {
      const res = await c.match(k);
      const stamp = res && (res.headers.get('x-shivaa-cached-at') || res.headers.get('date'));
      const t = stamp ? Date.parse(stamp) : NaN;
      if (isFinite(t) && t < cutoff) await c.delete(k);
    } catch (_) { /* a cache read problem must never break a page */ }
  }
}
function isImage(u) {
  return /\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:\?|$)/i.test(u.pathname);
}

/* v168 — CacheStorage is optional. Only public, known assets belong in it;
   payment pages, API answers, KYC and proof uploads never do. */
const shellURLs = new Set(SHELL_FILES);
function freshMedia(res) {
  if (!res || !/^image\//i.test(res.headers.get('content-type') || '')) return false;
  const stamp = res.headers.get('x-shivaa-cached-at') || res.headers.get('date');
  const at = stamp ? Date.parse(stamp) : NaN;
  return Number.isFinite(at) && Date.now() - at < MEDIA_TTL;
}
async function shellFallback(key, documentRequest) {
  try {
    const c = await caches.open(SHELL);
    const hit = await c.match(key);
    if (hit) return hit;
    if (documentRequest) {
      const page = await c.match('/index.html') || await c.match('/offline.html');
      if (page) return page;
    }
  } catch (_) {}
  return documentRequest
    ? new Response('Shivaa is offline. Please reconnect and retry.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    : Response.error();
}
self.addEventListener('fetch', (e) => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  // No API is a live success when replayed offline; app.js owns its labelled catalogue fallback.
  if (r.headers.has('authorization') || u.pathname.startsWith('/api/') || u.pathname.startsWith('/data/')) return;
  if (/\.(?:mp4|webm|mov|m4v)$/i.test(u.pathname)) return;

  const publicImage = isImage(u) && (u.pathname.startsWith('/images/') || /^\/uploads\/designs\/[^/]+\//.test(u.pathname));
  if (publicImage) {
    const cache = caches.open(MEDIA).catch(() => null);
    const refreshed = fetch(r).then(async res => {
      // An SPA 200 HTML fallback must NEVER poison an image URL.
      if (res && res.ok && /^image\//i.test(res.headers.get('content-type') || '')) {
        try {
          const c = await cache;
          if (c) {
            const copy = res.clone();
            const headers = new Headers(copy.headers);
            headers.set('x-shivaa-cached-at', new Date().toUTCString());
            await c.put(r, new Response(await copy.blob(), { status: copy.status, statusText: copy.statusText, headers }));
            await trimMedia();
          }
        } catch (_) { /* quota/private mode cannot break the network image */ }
      }
      return res;
    }).catch(() => null);
    // Register during dispatch, not after returning a cached response.
    e.waitUntil(refreshed.then(() => {}));
    e.respondWith((async () => {
      try {
        const c = await cache;
        const hit = c && await c.match(r);
        if (freshMedia(hit)) return hit;
        if (hit) await c.delete(r);
      } catch (_) {}
      return (await refreshed) || Response.error();
    })());
    return;
  }
  // Unlisted URLs (including all private uploads and PHP utilities) bypass the worker.
  const documentRequest = (r.mode === 'navigate' || (r.headers.get('accept') || '').includes('text/html')) &&
    (u.pathname === '/' || u.pathname === '/index.html');
  const key = documentRequest ? '/index.html' : u.pathname + u.search;
  if (!documentRequest && !shellURLs.has(key)) return;
  const response = fetch(r).then(async res => {
    if (res && res.ok) {
      try { const c = await caches.open(SHELL); await c.put(key, res.clone()); } catch (_) {}
    }
    return res;
  }).catch(() => shellFallback(key, documentRequest));
  e.waitUntil(response.then(() => {}, () => {}));
  e.respondWith(response);
});
