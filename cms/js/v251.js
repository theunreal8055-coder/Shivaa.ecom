/* ═══════════════════════════════════════════════════════════════════════════
   v251 · “ALIVE” — the two moments that have to feel live, scripted.

   css/v251.css gives the phone its motion back out of the only budget it has
   (transform and opacity, on interaction). Two of the signals cannot be written
   in CSS, because they are answers to an event:

     · THE BAG ANSWERS. Adding something to the bag changes a counter in the
       corner. `.shv-pop` on that badge for 320 ms is the receipt — one element,
       one scale, in the same frame as the tap.

     · THE RATE HAIRLINE. When a fresh gold rate lands (the `rates` event), the
       utility strip sweeps a gold hairline once. It is the only way a shopper
       can tell that a live price actually updated rather than merely being
       there — and it is 520 ms of one pseudo-element.

   Both are added as a class and removed by a timer that cannot leak: the class
   is written on a single element, and the timer is cleared every time the class
   is re-applied, so a burst of changes produces one animation, not a queue.

   AND ONE GUARD: the quiet pass in js/v250.js stops every never-ending animation
   on a phone. The three that are *signals* (a pending price, the skeleton, the
   live dot) must survive it — they exist only while something is still loading,
   so they are named in its keep list. `Shivaa.v251.pulses()` reports how many
   such signals exist right now, which is the number that must stay small.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvAlive) return;
  window.__shvAlive = true;

  var doc = document;
  var timers = Object.create(null);

  /* ── 1 · the bag answers ──────────────────────────────────────────────── */
  function pop(el) {
    if (!el) return;
    var key = el.id || 'badge';
    clearTimeout(timers[key]);
    el.classList.remove('shv-pop');
    /* a reflow-free restart: removing and re-adding in the same task is enough
       because the class is re-applied after the browser discards the old
       animation — and if it is not, the badge is already at rest. */
    void el.offsetWidth;
    el.classList.add('shv-pop');
    timers[key] = setTimeout(function () { el.classList.remove('shv-pop'); }, 340);
  }

  function watchBadge(id) {
    var el = doc.getElementById(id);
    if (!el || !window.MutationObserver) return;
    var last = el.textContent;
    new MutationObserver(function () {
      var now = el.textContent;
      if (now !== last) { last = now; pop(el); }
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }
  function watchBadges() {
    watchBadge('cartCount');
    watchBadge('wishCount');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watchBadges, { once: true });
  else watchBadges();

  /* the decode sweep is a backstop, not the plan: templates emit
     `decoding="async"` themselves (css/../js/app.js thumbAttrs). This catches a
     template that forgot, once, and counts what it caught. */
  window.__shvImgFix = 0;
  function sweep() {
    var fixed = syncImages();
    window.__shvImgFix += fixed.length;
    if (fixed.length && /[?&]v251=1/.test(location.search)) {
      try { console.info('[v251] decoded async late:', fixed.slice(0, 10)); } catch (e) {}
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(sweep, 60); }, { once: true });
  else setTimeout(sweep, 60);
  addEventListener('hashchange', function () { setTimeout(sweep, 700); }, { passive: true });

  /* ── 2 · the rate hairline ────────────────────────────────────────────── */
  var tickT = 0;
  function tick() {
    var el = doc.getElementById('utilRates');
    if (!el) return;
    el.classList.remove('shv-tick');
    void el.offsetWidth;
    el.classList.add('shv-tick');
    clearTimeout(tickT);
    tickT = setTimeout(function () { el.classList.remove('shv-tick'); }, 560);
  }
  addEventListener('rates', tick, { passive: true });

  /* ── 3 · where am I in the page ─────────────────────────────────────────
     One fixed hairline, filled to the shopper's position. Transform only, one
     rAF per scroll frame, and the page height is measured on resize and after a
     route settles rather than read on every frame — reading `scrollHeight` in a
     scroll handler is how a “smooth” feature becomes the jank it answered. */
  var bar = null, docH = 0, winH = 0, rafId = 0, lastP = -1, measT = 0;

  function ensureBar() {
    if (bar && bar.isConnected) return bar;
    if (!doc.body) return null;
    bar = doc.getElementById('shvReadBar');
    if (!bar) {
      bar = doc.createElement('div');
      bar.id = 'shvReadBar';
      bar.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(bar);
    }
    return bar;
  }
  function measure() {
    docH = doc.documentElement.scrollHeight || 0;
    winH = window.innerHeight || doc.documentElement.clientHeight || 0;
  }
  function paint() {
    var b = ensureBar();
    if (!b) return;
    var room = docH - winH;
    var p = room > 24 ? (window.pageYOffset || doc.documentElement.scrollTop || 0) / room : 0;
    if (p < 0) p = 0; if (p > 1) p = 1;
    if (Math.abs(p - lastP) < 0.0015) return;
    lastP = p;
    b.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    b.style.opacity = p > 0.004 ? '.92' : '0';
  }
  function queue() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () { rafId = 0; paint(); });
  }
  function remeasure(later) {
    clearTimeout(measT);
    measT = setTimeout(function () { measure(); lastP = -1; queue(); }, later || 0);
  }
  if (window.requestAnimationFrame) {
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', function () { remeasure(60); }, { passive: true });
    addEventListener('orientationchange', function () { remeasure(220); }, { passive: true });
    addEventListener('hashchange', function () { remeasure(420); }, { passive: true });
    addEventListener('load', function () { remeasure(0); }, { once: true });
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { remeasure(0); }, { once: true });
    else remeasure(0);
  }

  /* ── 4 · how many signals are running ─────────────────────────────────── */
  function pulses() {
    var scope = doc.getElementById('view') || doc.body;
    var n = 0;
    var pending = scope.querySelectorAll('.pr-sk');
    for (var i = 0; i < pending.length; i++) n++;
    if (doc.querySelector('.ub-live')) n++;
    return n;
  }

  /* ── 5 · every picture decodes off the main thread ──────────────────────
     `decoding="async"` lets the browser decode a JPEG while it is still laying
     out the page instead of blocking the frame the picture lands in. It is the
     cheapest smoothness in the product and the easiest to lose, because every
     new template has to remember it — so this reports the ones that forgot, and
     `?v251=1` prints the list. */
  function syncImages() {
    var bad = [];
    var imgs = doc.images || [];
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if ((im.getAttribute('decoding') || '') !== 'async') {
        im.setAttribute('decoding', 'async');
        bad.push(im.currentSrc || im.src || '(no src)');
      }
    }
    return bad;
  }

  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v251 = {
    pulses: pulses,
    pop: pop,
    tick: tick,
    syncImages: syncImages,
    progress: function () { return lastP < 0 ? 0 : lastP; },
    /** one line, in the same shape as the other three reports */
    report: function () {
      return 'alive ' + (window.__SHIVAA_REL || 0) +
        ' · ' + (doc.documentElement.classList.contains('shv-mobile') ? 'phone' : 'desktop') +
        ' · live pulses ' + pulses() +
        ' · pending prices ' + doc.querySelectorAll('.pr-sk').length +
        ' · sync-decode fixups ' + (window.__shvImgFix || 0) +
        ' · page ' + Math.round((lastP < 0 ? 0 : lastP) * 100) + '%';
    }
  };
})();
