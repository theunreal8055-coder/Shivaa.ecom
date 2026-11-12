/* ═══════════════════════════════════════════════════════════════
   SHIVAA v241 — "smooth" (the home page stops stuttering)

   The owner, after v240 fixed the drawer: "app smooth feel nahi hota,
   shuru main home page par lag karta hai — zomato/uber jaisa smooth
   chahiye". This layer answers that with measurements, not adjectives.

   What was actually heavy on the first screen of Home:
     1 · every card and tile downloaded the FULL-WIDTH original photograph
         (200–420 KB each). 12 bestsellers + 17 categories ≈ 2–5 MB pulled
         and decoded while the thumb was already scrolling.
         → app.js now renders cards with a 320/560 w WebP sibling
           (qa/build-thumbs.py), and this file upgrades any picture a
           template forgot, by measuring the slot it is actually drawn in.
     2 · a third-party payment SDK was fetched and parsed on EVERY page,
         for a checkout most visitors never start. app.js already loads
         it on demand inside cashfreeCheckout() — index.html no longer
         ships a duplicate <script> (removed in this release).
     3 · a phone that already held the catalogue still watched the splash
         for up to 6 s over data it had on the device. app.js paints at
         800 ms in that case.
     4 · the sticky header and the bottom bar re-blurred the whole page
         behind them on every scroll frame (css/v241.css replaces the
         blur with a 98.5 % opaque fill on touch widths — same look,
         no per-frame GPU pass).

   ?perf=1 prints the real numbers on the phone (nothing renders without
   the flag). This file never hides, moves or re-orders anything: with
   JS off the site is exactly the site.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  var REL = window.__SHIVAA_REL || 241;
  /* same four folders qa/build-thumbs.py converts — nothing else is touched */
  var THUMB_RE = /^\/images\/(?:products|categories|reviews|offers)\/.+\.(?:jpe?g|png)$/i;
  var LOGO = '/images/logo.png?v=' + REL;

  function thumb(src, w) {
    var u = String(src == null ? '' : src).split('?')[0];
    if (!THUMB_RE.test(u)) return '';
    /* ?v= makes .htaccess serve these immutably for a year (see thumbAttrs in app.js) */
    return '/images/thumbs/' + u.slice(8).replace(/\.(?:jpe?g|png)$/i, '') + '-' + w + '.webp?v=' + REL;
  }

  /* ── 1 · measured upgrade for pictures a template did not convert ────────
     `sizes` comes from the box the picture is DRAWN in, not from a guess: a
     180 px card at 2× asks for 360 px and gets the 560 sibling (≈28 KB
     instead of ≈220 KB). If the element has no layout yet the pass is skipped
     and retried — an upgrade is never applied twice. */
  /* v242 — WHERE a small picture is allowed to replace a big one.
     v241 upgraded every image under those four folders by measured width, which
     also caught the product page's main gallery photo and the category hero art:
     a full-width 380 px photograph was replaced by the 560 px sibling, so it
     rendered soft on a 3x phone. The win is in the GRIDS — a card is 180 px wide
     — so the upgrade is now scoped to the grids and nothing else. Everything
     outside this list keeps the original file the shop has always served. */
  var GRID_IMG = '.pc-imgwrap img, .cat-mini-card img, .mt-img img, .dw-catlist img, .rev-photo, .ugc-ph img, .offer-card img';

  function upgrade(img) {
    if (!img || img.dataset.v241) return false;
    var src = img.getAttribute('src') || '';
    if (!THUMB_RE.test(src.split('?')[0])) return false;
    if (img.hasAttribute('srcset') || img.dataset.full) { img.dataset.v241 = '1'; return false; }
    /* v242 — only inside a grid/card; a gallery or hero photograph is left alone */
    if (!img.matches(GRID_IMG) && !img.closest(GRID_IMG)) { img.dataset.v241 = '1'; return false; }
    var w1 = thumb(src, 320), w2 = thumb(src, 560);
    if (!w1 || !w2) return false;
    var box = img.getBoundingClientRect();
    var w = Math.round(box.width);
    if (!w && img.parentElement) w = Math.round(img.parentElement.getBoundingClientRect().width);
    if (!w) return false;                    // not laid out yet — next pass
    img.dataset.v241 = '1';
    img.dataset.full = src;
    img.setAttribute('srcset', w1 + ' 320w, ' + w2 + ' 560w');
    img.setAttribute('sizes', w + 'px');
    img.setAttribute('decoding', 'async');
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    /* a sibling that is missing (a picture added after this release) must never
       leave a hole: fall back to the original once, then to the logo. */
    img.addEventListener('error', function onerr() {
      img.removeEventListener('error', onerr);
      if (img.dataset.fb) { img.onerror = null; img.src = LOGO; return; }
      img.dataset.fb = '1';
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = img.dataset.full;
    });
    return true;
  }

  function sweep(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var imgs = scope.querySelectorAll('img:not([data-v241])');
    var n = 0;
    for (var i = 0; i < imgs.length; i++) { if (upgrade(imgs[i])) n++; }
    /* the honest backlog: any picture with neither loading nor decoding set
       waits invisibly for the browser's default policy. Marking it lazy +
       async is free and never changes what is on screen. */
    var rest = scope.querySelectorAll('img:not([data-v241-lazy])');
    for (var j = 0; j < rest.length; j++) {
      var el = rest[j];
      el.dataset.v241Lazy = '1';
      if (!el.getAttribute('decoding')) el.setAttribute('decoding', 'async');
      if (!el.getAttribute('loading') && !el.hasAttribute('data-eager') && !el.closest('.hero, .page-hero')) {
        el.setAttribute('loading', 'lazy');
      }
    }
    return n;
  }

  var pending = 0;
  function sweepSoon(root) {
    if (pending) return;
    pending = 1;
    (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(function () {
      pending = 0;
      try { sweep(root); } catch (e) {}
    });
  }

  function boot() {
    try { sweep(document); } catch (e) {}
    /* every route paints #view; watch only that node, never the whole body */
    var view = document.getElementById('view');
    if (view && typeof MutationObserver === 'function' && !view._v241obs) {
      view._v241obs = true;
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) { if (ms[i].addedNodes && ms[i].addedNodes.length) { sweepSoon(view); return; } }
      }).observe(view, { childList: true, subtree: true });
    }
    addEventListener('hashchange', function () { sweepSoon(document); }, { passive: true });
    /* late pictures (drawer, mega panel, sheets opened after first paint) */
    setTimeout(function () { try { sweep(document); } catch (e) {} }, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  /* ── 2 · ?perf=1 — the owner's own stopwatch ─────────────────────────────
     Open  shivaa.in/?perf=1  (or add &perf=1 to any link). Prints what the
     phone actually waited for, and the ten heaviest files of that visit. */
  function perfReport() {
    try {
      var nav = performance.getEntriesByType('navigation')[0] || {};
      var res = performance.getEntriesByType('resource') || [];
      var by = {}, biggest = [];
      res.forEach(function (r) {
        var k = /\.(css)(\?|$)/.test(r.name) ? 'CSS'
              : /\.js(\?|$)/.test(r.name) ? 'JS'
              : /\.(jpe?g|png|webp|avif|gif)(\?|$)/.test(r.name) ? 'IMAGES'
              : /\.(woff2?|ttf)(\?|$)/.test(r.name) ? 'FONTS'
              : /\/api\//.test(r.name) ? 'API' : 'OTHER';
        var t = r.transferSize || 0;
        by[k] = (by[k] || 0) + t;
        biggest.push([t, r.name]);
      });
      biggest.sort(function (a, b) { return b[0] - a[0]; });
      var total = 0; Object.keys(by).forEach(function (k) { total += by[k]; });
      var rows = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })
        .map(function (k) { return k + ' ' + Math.round(by[k] / 1024) + ' KB'; }).join(' · ');
      var top = biggest.slice(0, 6).map(function (x) {
        return '<li>' + Math.round(x[0] / 1024) + ' KB · ' + String(x[1]).replace(/^https?:\/\/[^/]+/, '').slice(0, 64) + '</li>';
      }).join('');
      var box = document.createElement('div');
      box.setAttribute('id', 'v241perf');
      box.style.cssText = 'position:fixed;z-index:99999;left:10px;right:10px;bottom:74px;background:#1d0509;color:#f7e7c6;'
        + 'font:11.5px/1.55 ui-monospace,Menlo,monospace;border:1px solid #d4af5a;border-radius:14px;padding:12px 14px;'
        + 'max-height:52vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.55)';
      box.innerHTML = '<b style="color:#ffe9bd">v' + REL + ' · phone timing</b>'
        + '<div style="margin:6px 0">first byte ' + Math.round(nav.responseStart || 0) + ' ms · DOM ready ' + Math.round(nav.domContentLoadedEventEnd || 0)
        + ' ms · page load ' + Math.round((nav.loadEventEnd || 0)) + ' ms</div>'
        + '<div style="margin:6px 0">downloaded ' + Math.round(total / 1024) + ' KB — ' + rows + '</div>'
        + '<div style="margin:6px 0"><b>heaviest:</b><ul style="margin:4px 0 0 16px;padding:0">' + top + '</ul></div>'
        + '<div style="opacity:.65">v241 takes card pictures from /images/thumbs (320/560 px). Nothing else changed.</div>';
      box.addEventListener('click', function () { box.remove(); });
      document.body.appendChild(box);
    } catch (e) {}
  }
  if (/[?&]perf=1\b/.test(location.search) || /[?&]perf=1\b/.test(location.hash)) {
    addEventListener('load', function () { setTimeout(perfReport, 900); }, { once: true });
  }

  /* expose for the QA suite and for future layers */
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v241 = { thumb: thumb, upgrade: upgrade, sweep: sweep };
})();
