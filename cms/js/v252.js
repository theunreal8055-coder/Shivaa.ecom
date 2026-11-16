/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA · v252 — “SILK”
   Companion to css/v252.css. Four quiet responsibilities, zero idle timers,
   zero layout reads during scroll, zero subtree class observers:

     1 · FRAME-1 TACTILE SPRING. Stamps `.shv-tap` passively on `pointerdown` so
         a quick phone tap answers on its first frame instead of losing the
         80–150 ms browser `:active` hesitation; cancels in 0 ms if the thumb
         moves > 8 px or a scroll starts.

     2 · LIVE COUNTER RESPONSES. Wishlist heart taps spring (`.shv-heart-pop`),
         the compare badge (`#cmpCount`) joins bag & wishlist badge pops, and a
         2 px golden hairline (`#shvRouteGlide`) answers route changes on frame 1
         even before deferred ambience scripts load.

     3 · INTENT PRE-WARM. Hovering a piece card for 90 ms (desktop) or touching
         it (phone, unless Save-Data / 2G is on) decodes its main photograph off
         the main thread and warms its detail payload so the piece page opens
         already finished, with full-resolution imagery intact.

     4 · DIAGNOSTIC REPORT. `Shivaa.v252.audit()` and `Shivaa.v252.report()`
         return measured boot mode/time, instant PDP opens, tactile responses,
         route glides and pre-warmed pieces.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvSilk) return;
  window.__shvSilk = true;

  var doc = document, root = doc.documentElement, win = window;
  var REL = Number(win.__SHIVAA_REL || 252);
  var NOFX = /[?&]nofx=1/.test(location.search || '');
  var REDUCED = false;
  try { REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var LIVE = !NOFX && !REDUCED;

  var isMobile = function () { return root.classList.contains('shv-mobile'); };
  var stats = { taps: 0, cancelled: 0, hearts: 0, glides: 0, prewarmed: 0 };

  /* ── 1 · frame-1 tactile spring (phone only) ──────────────────────────── */
  var TAP_SEL = '.btn, .icon-btn, .pc-wish, .pc-quick, .dw-close, .qty button, ' +
    '.cb-item, .chip, .tab, .dw-row, .dw-tile, .dw-more, .nav-jwl, .mnav a, .mnav button, ' +
    '.p-card, .tv-card, .ugc-card, .pc-card, .cat-card, .cat-mini-card, .pillar, .catlog, .shv-offer-card';
  var activeEl = null, startX = 0, startY = 0, relTimer = 0, cancelTimer = 0;

  function releaseTap(instant) {
    if (!activeEl) return;
    var el = activeEl;
    activeEl = null;
    clearTimeout(relTimer);
    if (instant) {
      stats.cancelled++;
      el.classList.remove('shv-tap');
      el.classList.add('shv-tap-cancel');
      clearTimeout(cancelTimer);
      cancelTimer = setTimeout(function () { el.classList.remove('shv-tap-cancel'); }, 50);
      return;
    }
    /* keep the press visible for at least 75 ms so a 35 ms flick-tap is felt */
    relTimer = setTimeout(function () { el.classList.remove('shv-tap'); }, 75);
  }

  if (LIVE) {
    doc.addEventListener('pointerdown', function (e) {
      if (!isMobile()) return;
      if (e.button && e.button !== 0) return;
      var t = e.target && e.target.closest ? e.target.closest(TAP_SEL) : null;
      if (!t || t.disabled) return;
      if (activeEl && activeEl !== t) activeEl.classList.remove('shv-tap');
      clearTimeout(relTimer);
      activeEl = t;
      startX = e.clientX || 0;
      startY = e.clientY || 0;
      t.classList.remove('shv-tap-cancel');
      t.classList.add('shv-tap');
      stats.taps++;
    }, { passive: true });

    doc.addEventListener('pointermove', function (e) {
      if (!activeEl) return;
      var dx = (e.clientX || 0) - startX, dy = (e.clientY || 0) - startY;
      if (dx * dx + dy * dy > 64) releaseTap(true);
    }, { passive: true });

    doc.addEventListener('pointerup', function () { releaseTap(false); }, { passive: true });
    doc.addEventListener('pointercancel', function () { releaseTap(true); }, { passive: true });
    win.addEventListener('scroll', function () { if (activeEl) releaseTap(true); }, { passive: true });
    win.addEventListener('blur', function () { releaseTap(true); }, { passive: true });
  }

  /* ── 2 · live counter responses (heart spring · compare pop · route glide) */
  var HEART_SEL = '.pc-wish, [data-wish], #pdWish, [onclick*="toggleWish"]';
  function pulseOnce(el, cls, ms) {
    if (!LIVE || !el) return;
    el.classList.remove(cls);
    var raf = win.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    raf(function () {
      el.classList.add(cls);
      clearTimeout(el._shvPulseT);
      el._shvPulseT = setTimeout(function () { el.classList.remove(cls); }, ms || 340);
    });
  }

  if (LIVE) {
    /* capture: true so card hearts using event.stopPropagation() still spring */
    doc.addEventListener('click', function (e) {
      var h = e.target && e.target.closest ? e.target.closest(HEART_SEL) : null;
      if (!h) return;
      stats.hearts++;
      pulseOnce(h, 'shv-heart-pop', 340);
      try { if (win.Shivaa && typeof win.Shivaa.haptic === 'function') win.Shivaa.haptic(8); } catch (_) {}
    }, { capture: true, passive: true });
  }

  function watchCompareBadge() {
    if (!LIVE || !win.MutationObserver) return;
    var b = doc.getElementById('cmpCount');
    if (!b || b._shvWatched) return;
    b._shvWatched = 1;
    var last = b.textContent;
    try {
      new MutationObserver(function () {
        var now = b.textContent;
        if (now === last) return;
        last = now;
        if (!b.hidden && now && now !== '0') pulseOnce(b, 'shv-pop', 380);
      }).observe(b, { childList: true, characterData: true, subtree: true });
    } catch (_) {}
  }

  var glide = null, glideOffT = 0, glideResetT = 0, glideActive = false;
  function ensureGlide() {
    if (glide || !doc.body) return glide;
    glide = doc.createElement('div');
    glide.id = 'shvRouteGlide';
    glide.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(glide);
    return glide;
  }
  function startGlide() {
    if (!LIVE || doc.hidden) return;
    var g = ensureGlide();
    if (!g) return;
    clearTimeout(glideOffT);
    clearTimeout(glideResetT);
    glideActive = true;
    stats.glides++;
    g.classList.remove('is-done');
    g.classList.add('is-on');
    /* safety settle even if a route updates nothing in #view */
    glideOffT = setTimeout(finishGlide, 420);
  }
  function finishGlide() {
    if (!glide || !glideActive) return;
    glideActive = false;
    clearTimeout(glideOffT);
    glide.classList.remove('is-on');
    glide.classList.add('is-done');
    clearTimeout(glideResetT);
    glideResetT = setTimeout(function () {
      if (glide) glide.classList.remove('is-done');
    }, 220);
  }

  function wireRouteGlide() {
    if (!LIVE) return;
    win.addEventListener('hashchange', startGlide, { passive: true });
    var view = doc.getElementById('view');
    if (view && win.MutationObserver) {
      try {
        new MutationObserver(function () {
          if (glideActive) {
            clearTimeout(glideOffT);
            glideOffT = setTimeout(finishGlide, 90);
          }
        }).observe(view, { childList: true });
      } catch (_) {}
    }
  }

  /* ── 3 · intent pre-warm (zero quality loss, save-data aware) ─────────── */
  var warmed = Object.create(null), warmedCount = 0, hoverT = 0;
  function dataSaverOn() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return false;
      if (c.saveData) return true;
      return /(^|-)2g$/i.test(String(c.effectiveType || ''));
    } catch (_) { return false; }
  }
  function pidFromTarget(target) {
    if (!target || !target.closest) return '';
    var card = target.closest('[data-pid]');
    if (card && card.dataset && card.dataset.pid) return String(card.dataset.pid);
    var link = target.closest('a[href^="#/product/"]');
    if (!link) return '';
    var m = String(link.getAttribute('href') || '').match(/^#\/product\/([A-Za-z0-9_-]{1,40})/);
    return m ? m[1] : '';
  }
  function warmPiece(pid) {
    if (!pid || warmed[pid] || warmedCount >= 24 || dataSaverOn()) return;
    if (root.classList.contains('shv-scrolling')) return;
    warmed[pid] = 1;
    warmedCount++;
    stats.prewarmed++;
    try {
      if (win.Shivaa && typeof win.Shivaa.warmProduct === 'function') {
        win.Shivaa.warmProduct(pid);
      }
    } catch (_) {}
  }

  doc.addEventListener('pointerover', function (e) {
    if (isMobile()) return;
    var pid = pidFromTarget(e.target);
    if (!pid || warmed[pid]) return;
    clearTimeout(hoverT);
    hoverT = setTimeout(function () { warmPiece(pid); }, 90);
  }, { passive: true });

  doc.addEventListener('touchstart', function (e) {
    var pid = pidFromTarget(e.target);
    if (pid && !warmed[pid]) warmPiece(pid);
  }, { passive: true });

  /* ── 4 · boot & diagnostic API ────────────────────────────────────────── */
  function start() {
    watchCompareBadge();
    wireRouteGlide();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  function audit() {
    return {
      rel: REL,
      device: isMobile() ? 'phone' : 'desktop',
      live: LIVE,
      bootMode: win.__shvBootMode || 'pending',
      bootMs: Number(win.__shvBootMs || 0),
      pdpInstant: Number(win.__shvPdpInstant || 0),
      taps: stats.taps,
      cancelled: stats.cancelled,
      hearts: stats.hearts,
      glides: stats.glides,
      prewarmed: stats.prewarmed,
    };
  }
  function report() {
    var a = audit();
    return 'silk ' + a.rel + ' · ' + a.device +
      ' · boot ' + a.bootMode + ' (' + a.bootMs + ' ms)' +
      ' · instant pdp ' + a.pdpInstant +
      ' · taps ' + a.taps +
      ' · glides ' + a.glides +
      ' · prewarmed ' + a.prewarmed;
  }

  win.Shivaa = win.Shivaa || {};
  win.Shivaa.v252 = {
    rel: REL,
    audit: audit,
    report: report,
    warm: warmPiece,
  };
})();
