/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v166 — "ALWAYS THE LATEST" · the owner's three reports of 21 Sep 2026

   1 · "category button works and it shows categories on laptop then when we
        click on any kind of categories like rings or necklace then nothing
        happens"
       REPRODUCED, root-caused, and owned here. On a REAL network (several
       seconds, unlike a sandbox) js/v116.js wires #navCats FIRST: it adds its
       capture-phase toggle listener and marks the button `_wired`, so the
       whole block in app.js that attaches the mega panel's CLOSE behaviour is
       skipped (`if (catsBtn && !catsBtn._wired)`). The panel opened and its
       full-viewport backdrop (z-index 94, the panel 95) appeared with NO
       handler at all. Tapping a category did navigate underneath — but the
       backdrop stayed over the page, so the shopper still saw the 17 tiles and
       every later tap landed on a dead backdrop. Second tap on "Rings": same
       hash, no hashchange, literally nothing. Measured on the shipped tree
       with a 9 s first batch (the owner's laptop): panel open ✓, tile tap →
       hash changes ✓, panel still open ✗, backdrop tap → nothing ✗.
       FIX · overlay close ownership is unconditional and belongs to nobody's
       wiring race: close on a tile tap, on the backdrop, on an outside tap, on
       Escape, on scroll, and above all on EVERY navigation (hashchange or
       redraw) — a route never inherits an open overlay.

   2 · "sometimes the products on the page are shown and sometimes it's all
        empty … sometimes we have to refresh it … sometimes some animations or
        graphics are not loaded"
       REPRODUCED. `api()` had no timeout: a hung /api/products never resolves
       and never rejects, so the 6 s boot cap paints the shell with ZERO real
       pieces and the promised quiet re-paint never comes — an empty shop until
       the shopper refreshes. A /api/products 5xx is caught and turned into
       `{products: []}`, which is not a hang, so no retry ever ran either; the
       home page then showed only the 6 campaign studs and every category read
       "being catalogued" — exactly "the products are empty".
       FIX · a bounded request (AbortController), a real retry chain with
       backoff, a last-good catalogue kept on the device so a shopper can never
       land on an empty grid, and — when the network truly refuses — an honest,
       tappable "Retry" instead of a silent empty page. Plus a reveal failsafe:
       a .rv that the observer never reached can no longer stay invisible.

   3 · "people who logged in 15 days ago are still seeing the version that was
        15 days ago … in the next update I want a setting … that people should
        only see the latest version of the website"
       ROOT CAUSE, and it is a cache header, not a bug: .htaccess serves every
       ?v=… CSS/JS with `Cache-Control: public, max-age=31536000, immutable`
       for a YEAR — while the stamps on unchanged files stayed at their old
       numbers (styles.css?v=107, mobile.css?v=107, aurum.css?v=107,
       boost.css?v=46, auth.js?v=113b … 17 assets were still pinned at 107).
       A device that visited weeks ago holds those exact URLs for a year, so it
       keeps the old design and the old scripts no matter how often it
       refreshes. THIS RELEASE RE-STAMPS EVERY ASSET to ?v=166 (a URL that
       device has never seen → always fetched fresh) and adds the owner's
       requested switch: the backend setting **forceLatestVersion** (admin →
       Settings), on by default, which this layer obeys. A release check runs on
       every load, on returning to the tab, on focus and every 5 minutes against
       /api/version (never cached): if the server is on a newer release than the
       page that is running, the caches are cleared and the page is re-entered
       on the new release — never in front of a half-filled form, never during a
       payment, and at most once per release per session. Off = the old silent
       behaviour (swap on the next visit, no reload).

   Additive and self-guarding: every block checks for its element and its API.
   If this file never loads, the site behaves exactly as it did before. No
   route, price, rate, order or payment path is touched.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  /* v166's OWN release id — never bump this: it is the number this file moves
     devices TO (and the fallback when index.html has not stamped the page yet). */
  var REL = 166;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var w = window;

  /* ══════════════════════════════════════════════════════════════════════
     1 · OVERLAY OWNERSHIP — the laptop "category tap does nothing" (issue 1)
     ══════════════════════════════════════════════════════════════════════ */
  function closeOverlays() {
    var panel = $('#catMenu'), backdrop = $('#megaBackdrop'), btn = $('#navCats');
    var list = document.getElementById('dwCatList');
    if (panel && !panel.hidden) panel.hidden = true;
    if (backdrop && !backdrop.hidden) backdrop.hidden = true;
    if (btn) {
      if (btn.getAttribute('aria-expanded') !== 'false') btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('open');
    }
    if (list) list.classList.remove('open');
  }
  window.__shvCloseOverlays = closeOverlays;

  function isOverlayUp() {
    var panel = $('#catMenu'), backdrop = $('#megaBackdrop'), list = document.getElementById('dwCatList');
    return (!!panel && !panel.hidden) || (!!backdrop && !backdrop.hidden) || (!!list && list.classList.contains('open'));
  }

  function wireOverlays() {
    if (w.__shvOverlaysWired) return;
    w.__shvOverlaysWired = true;

    /* a) a tap INSIDE the panel: the navigation is already committed by the
          anchor, so the panel must leave the screen first — otherwise it and
          its backdrop hide the page the shopper just asked for. A repeat tap
          (same hash) still has to do something: redraw the route. */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var row = t.closest('#catMenu a, #dwCatList a, .mega-tile');
      if (row) {
        var href = row.getAttribute('href') || '';
        closeOverlays();
        if (href && href.charAt(0) === '#' && location.hash === href) {
          e.preventDefault();
          try { w.Shivaa && w.Shivaa.redraw && w.Shivaa.redraw(); } catch (_) {}
        }
        return;
      }
      /* b) the backdrop is a full-viewport overlay — it must never swallow a
            tap silently (this is the exact dead zone of the v116 regime) */
      if (t.closest('#megaBackdrop')) { closeOverlays(); return; }
      /* c) an outside tap closes the panel, exactly like the main nav does */
      if (!t.closest('#catMenu') && !t.closest('#navCats')) {
        if (isOverlayUp() && w.innerWidth > 820) closeOverlays();
      }
    }, true);

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlays(); });
    addEventListener('scroll', function () { if (w.innerWidth > 680) closeOverlays(); }, { passive: true });
    /* d) THE fix for the owner's report: no navigation ever inherits an open
          overlay. route() paints the new page; hashchange lands right after. */
    addEventListener('hashchange', closeOverlays);
    addEventListener('popstate', closeOverlays);
  }

  /* ══════════════════════════════════════════════════════════════════════
     2 · CATALOGUE RESILIENCE — "sometimes the products are all empty"
     ══════════════════════════════════════════════════════════════════════ */
  var CATALOG_KEY = 'shv_catalog_v166';
  var CATALOG_TTL = 1000 * 60 * 60 * 24 * 21;      // three weeks of last-good
  var catalogBusy = false, catalogTries = 0;

  function readLocalCatalog() {
    try {
      if (w.Shivaa && typeof w.Shivaa.catalogCacheRead === 'function') return w.Shivaa.catalogCacheRead();
      var o = JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null');
      if (o && o.at && (Date.now() - o.at) < CATALOG_TTL && o.products && o.products.length) return o.products;
    } catch (_) {}
    return null;
  }
  function writeLocalCatalog(ps) {
    try {
      if (w.Shivaa && typeof w.Shivaa.catalogCacheWrite === 'function') { w.Shivaa.catalogCacheWrite(ps); return; }
      if (ps && ps.length) localStorage.setItem(CATALOG_KEY, JSON.stringify({ at: Date.now(), products: ps }));
    } catch (_) {}
  }
  function state$() { return (w.Shivaa && w.Shivaa.state) || null; }
  function catalogOk() { var s = state$(); return !!(s && s.catalogOk); }
  /* the 6 campaign studs live in productsCache from module load, so only the
     real pieces count when asking "is the catalogue actually here?" */
  function realCount() {
    var s = state$();
    return ((s && s.productsCache) || []).filter(function (p) { return p && !p.isCampaignStud; }).length;
  }
  function mergeProducts(ps) {
    var s = state$(); if (!s) return;
    var studs = (s.productsCache || []).filter(function (p) {
      return p && p.isCampaignStud && !ps.some(function (q) { return q.id === p.id; });
    });
    s.productsCache = ps.concat(studs);
  }

  /* the honest retry strip — never a silent empty grid. Styled inline on
     purpose: it must render correctly even if every stylesheet on the device
     is an old cached copy (which is exactly the situation it exists for). */
  function retryStrip(show) {
    var el = document.getElementById('shvCatalogNote');
    if (!show) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'shvCatalogNote';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;' +
      'display:flex;gap:14px;align-items:center;max-width:min(92vw,560px);padding:12px 16px;border-radius:14px;' +
      'background:#1d0509;color:#f6efe2;font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
      'box-shadow:0 18px 44px rgba(31,4,9,.42)';
    el.innerHTML = '<span>We couldn\u2019t load the collection just now \u2014 you can carry on browsing, or try again.</span>' +
      '<button type="button" id="shvCatalogRetry" style="flex:0 0 auto;padding:9px 16px;border:0;border-radius:999px;' +
      'background:#d4af5a;color:#2a1a06;font:inherit;font-weight:700;cursor:pointer">Retry</button>';
    document.body.appendChild(el);
    var b = document.getElementById('shvCatalogRetry');
    if (b) b.addEventListener('click', function () {
      catalogTries = 0;
      b.disabled = true; b.textContent = 'Retrying\u2026';
      retryCatalog(function (okNow) {
        b.disabled = false; b.textContent = 'Retry';
        if (okNow) retryStrip(false);
      });
    });
  }

  function retryCatalog(done) {
    if (catalogBusy) return;
    if (!w.Shivaa || typeof w.Shivaa.api !== 'function') return;
    catalogBusy = true;
    var waits = [0, 1500, 4000, 9000, 12000];
    var i = 0;
    function step() {
      if (i >= waits.length) {
        catalogBusy = false;
        if (!realCount() && !readLocalCatalog()) retryStrip(true);
        if (done) done(false);
        return;
      }
      var wait = waits[i++];
      setTimeout(function () {
        w.Shivaa.api('/api/products', { timeout: 20000 }).then(function (r) {
          var ps = (r && r.products) || [];
          if (!ps.length) throw new Error('empty catalogue');
          var s = state$();
          if (s) { mergeProducts(ps); s.catalogOk = true; s.cacheAt = Date.now(); }
          writeLocalCatalog(ps);
          catalogBusy = false; catalogTries = 0;
          retryStrip(false);
          try { if (w.Shivaa.redraw) w.Shivaa.redraw(); } catch (_) {}
          if (done) done(true);
        }).catch(function () {
          /* the shopper must not stare at an empty grid for half a minute while
             we keep trying quietly: after the third refusal, say so and offer
             the tap — the remaining attempts still run behind the strip */
          if (i >= 3 && !realCount()) retryStrip(true);
          step();
        });
      }, wait);
    }
    step();
  }

  function catalogWatch() {
    /* a hung or refused /api/products leaves the shop empty: repaint from the
       device's last-good copy immediately, then repair in the background. */
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (!document.body || !document.body.dataset.page) { if (tries > 240) clearInterval(iv); return; }
      if (catalogOk()) { clearInterval(iv); retryStrip(false); return; }
      if (realCount() > 0) {                        // real pieces are on screen
        clearInterval(iv);
        if (!catalogOk()) retryCatalog();           // still refresh in the background
        return;
      }
      var cached = readLocalCatalog();
      var s = state$();
      if (cached && s && !realCount()) {
        mergeProducts(cached);
        try { if (w.Shivaa.redraw) w.Shivaa.redraw(); } catch (_) {}
      }
      if (tries >= 8) {                             // ~10 s after first paint
        clearInterval(iv);
        retryCatalog();
      }
    }, 1250);
  }

  addEventListener('online', function () { if (!catalogOk()) retryCatalog(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !catalogOk()) retryCatalog();
  });

  /* ══════════════════════════════════════════════════════════════════════
     3 · RELEASE FRESHNESS — "everyone should only see the latest version"
     ══════════════════════════════════════════════════════════════════════ */
  var TABLE_PAGES = ['checkout', 'cart', 'quote', 'catalogues', 'videoconsult', 'giftcard'];
  var freshBusy = false;

  function onATablePage() {
    try {
      if (TABLE_PAGES.indexOf(String(document.body.dataset.page || '')) >= 0) return true;
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      if (document.querySelector('.modal.open, #qvOverlay.open, .auth-panel.open')) return true;
      if (w._co && w._co.lockTimer) return true;      // a rate-locked checkout
    } catch (_) {}
    return false;
  }

  function purgeCaches() {
    var jobs = [];
    try {
      if (w.caches && caches.keys) {
        jobs.push(caches.keys().then(function (ks) {
          return Promise.all(ks.filter(function (k) { return /^shivaa-(?:shell|media)-v/.test(k); }).map(function (k) { return caches.delete(k).catch(function () {}); }));
        }).catch(function () {}));
      }
    } catch (_) {}
    try {
      var sw = navigator.serviceWorker;
      if (sw && sw.controller) { try { sw.controller.postMessage({ type: 'SHV_PURGE' }); } catch (_) {} }
      if (sw && sw.getRegistration) {
        jobs.push(sw.getRegistration().then(function (reg) {
          if (!reg) return;
          try { reg.update && reg.update(); } catch (_) {}
          try { if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
          try { if (reg.installing) reg.installing.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
        }).catch(function () {}));
      }
    } catch (_) {}
    return Promise.all(jobs);
  }

  /* the page URL itself carries the release, so a stale document can never be
     re-served from a browser cache that thinks nothing changed */
  function bustedUrl(rel) {
    var base = location.origin + location.pathname;
    try {
      var u = new URL(location.href);
      u.searchParams.set('shv', String(rel));
      return u.toString();
    } catch (_) { return base + '?shv=' + rel + (location.hash || ''); }
  }

  function enterLatest(rel) {
    var key = 'shv_forced_rel';
    try {
      if (sessionStorage.getItem(key) === String(rel)) return;
      sessionStorage.setItem(key, String(rel));
    } catch (_) {}
    var url = bustedUrl(rel);
    /* breadcrumb for support (and for the v166 gate): the exact URL a device
       re-entered the site on when it moved itself to a newer release */
    try { w.__shvLastReload = url; w.__shvLastReloadRel = rel; } catch (_) {}
    purgeCaches().then(function () {
      try { location.replace(url); }
      catch (_) { try { location.reload(); } catch (__) {} }
    });
  }

  function softSwap() {
    /* forceLatestVersion OFF, or the shopper is mid-form: let the service
       worker take over silently and pick the new release up on the next visit —
       the pre-v166 behaviour, now on purpose. */
    try {
      navigator.serviceWorker && navigator.serviceWorker.getRegistration &&
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        });
    } catch (_) {}
  }

  function checkRelease(reason) {
    if (freshBusy) return;
    freshBusy = true;
    var local = +(w.__SHIVAA_REL || REL);
    fetch('/api/version?_=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        freshBusy = false;
        if (!v || !v.rel) return;
        var server = +v.rel || 0;
        if (server <= local) return;
        var forced = v.forceLatest !== false;
        /* the backend switch /api/settings carries the owner's choice */
        var s = state$();
        if (s && s.settings && s.settings.forceLatestVersion === false) forced = false;
        if (forced && !onATablePage()) { enterLatest(server); return; }
        softSwap();
        if (forced) {
          /* the shopper arrived on the newest release: apply it the moment the
             tab is hidden or the form is left — never in front of their eyes */
          var apply = function () {
            if (document.hidden) { enterLatest(server); return; }
            if (!onATablePage()) { enterLatest(server); return; }
          };
          document.addEventListener('visibilitychange', function () { if (document.hidden) apply(); });
          addEventListener('blur', function () { setTimeout(apply, 400); }, { once: true });
        }
      })
      .catch(function () { freshBusy = false; });
  }
  w.__shvCheckRelease = checkRelease;

  /* the service worker announces a fresh shell the moment it activates */
  try {
    navigator.serviceWorker && navigator.serviceWorker.addEventListener &&
      navigator.serviceWorker.addEventListener('message', function (e) {
        var d = e && e.data;
        if (d && d.type === 'SHV_RELEASE' && +(d.rel || 0) > +(w.__SHIVAA_REL || REL)) {
          checkRelease('sw-message');
        }
      });
  } catch (_) {}

  /* ══════════════════════════════════════════════════════════════════════
     4 · GRAPHICS FAILSAFE — "some animations or graphics are not loaded"
     ══════════════════════════════════════════════════════════════════════ */
  function retryEnhancements() {
    if (w.__shvAurum || document.documentElement.classList.contains('js-aurum')) return;
    if (w.__shvEnhRetry) return;
    w.__shvEnhRetry = true;
    /* v167 — THESE THREE URLS WERE FROZEN AT 166. This is the graphics failsafe
       — the one path that runs exactly when the ambience did NOT load — and it
       asked for /js/aurum.js?v=166 while the shell was already on a newer
       release. `.htaccess` serves any ?v= URL as `immutable` for a year, so on
       the very devices that had already seen 166 the failsafe re-loaded the
       SAME bytes that had just failed, and on a device that had moved on it
       fetched a version the rest of the page no longer matched. It now rides
       the release the page is actually running, exactly like v117.js does. */
    var assetRel = +(w.__SHIVAA_REL || REL);
    var files = ['/js/aurum.js?v=' + assetRel, '/js/motion.js?v=' + assetRel, '/js/boost.js?v=' + assetRel];
    files.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res) {
          var s = document.createElement('script');
          s.src = src; s.async = false;
          s.onload = res; s.onerror = res;
          document.body.appendChild(s);
        });
      });
    }, Promise.resolve());
  }
  function revealSweep() {
    var moved = false;
    $$('.rv:not(.in), .rvl:not(.seen)').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 1.4 && r.bottom > -200) {
        el.classList.add(el.classList.contains('rvl') ? 'seen' : 'in');
        moved = true;
      }
    });
    /* if the reveal layer never ran at all, show everything rather than risk a
       page that looks half-loaded (the CSS failsafe is already there) */
    if (!moved && !$$('.rv.in, .rvl.seen').length && $$('.rv, .rvl').length) {
      document.documentElement.classList.add('js-reveal-off');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     boot of the layer
     ══════════════════════════════════════════════════════════════════════ */
  function start() {
    wireOverlays();
    catalogWatch();

    setTimeout(retryEnhancements, 5000);
    setTimeout(revealSweep, 2600);
    setTimeout(revealSweep, 6500);

    setTimeout(function () { checkRelease('load'); }, 1500);
    setInterval(function () { if (!document.hidden) checkRelease('interval'); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkRelease('visible'); });
    addEventListener('pageshow', function () { checkRelease('pageshow'); });
    addEventListener('focus', function () { checkRelease('focus'); });

    /* a returning device may still hold the pre-v166 service worker: ask it to
       re-check itself now, and let the freshness controller decide the rest */
    try {
      navigator.serviceWorker && navigator.serviceWorker.getRegistration &&
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.update) reg.update().catch(function () {});
        });
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

})();
