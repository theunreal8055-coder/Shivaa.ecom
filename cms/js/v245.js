/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · v245 — "scroll back" (the runtime guard rail)

   css/v245.css deletes the real cause (content-visibility on the grids) and
   stops it coming back. This file makes sure a bad state cannot survive a
   single second on the shopper's phone:

     1 · THE PARKING CANNOT STICK. v244 adds `html.shv-scrolling` while the
         thumb moves. If a timer is throttled, a tab is restored from the
         back/forward cache, or a script throws mid-gesture, that class would
         stay on and the whole page would look frozen. A 400 ms watchdog now
         removes it whenever no scroll has happened for 400 ms — and a
         `pageshow` / visibility / route change removes it immediately.

     2 · A PICTURE IN FRONT OF THE SHOPPER IS NEVER LEFT BLANK. After every
         render and whenever scrolling settles, the images that are actually
         on screen are checked once; any that has not started loading is
         asked for right away. (This is the safety net for the skipped-subtree
         bug: the images inside a skipped card never started at all.)

     3 · `?nofx=1` is the kill switch: no parking, no decode-ahead, nothing
         but the plain site — the fastest way to prove which layer is at
         fault on a device we cannot hold.

     4 · `window.Shivaa.v245.audit()` returns the numbers a report needs:
         parked or not, images on screen that are still blank, the document's
         scroll height, and whether anything is still content-visibility.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvScrollGuard) return;
  window.__shvScrollGuard = true;

  var doc = document, root = doc.documentElement, win = window;
  var NOFX = /[?&]nofx=1/.test(location.search || '');
  var stats = { unparked: 0, forced: 0, audits: 0, woken: 0 };
  if (NOFX) root.classList.add('shv-plain');

  function busy() {
    return !!(win.Shivaa && win.Shivaa.v244 && win.Shivaa.v244.scrolling);
  }

  /* ── 1 · the parking cannot stick ─────────────────────────────────────── */
  function unpark(why) {
    if (!root.classList.contains('shv-scrolling') && !busy()) return false;
    root.classList.remove('shv-scrolling');
    var v244 = win.Shivaa && win.Shivaa.v244;
    if (v244 && typeof v244.parkOff === 'function') { try { v244.parkOff(); } catch (e) {} }
    stats.unparked++;
    return true;
  }
  /* the watchdog: cheap, and it stops itself when there is nothing to do */
  setInterval(function () {
    var t = win.__shvLastScroll || 0;
    if (root.classList.contains('shv-scrolling') && (performance.now() - t) > 400) unpark('watchdog');
  }, 400);
  ['scroll', 'wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    win.addEventListener(ev, function () { win.__shvLastScroll = performance.now(); }, { passive: true });
  });
  ['hashchange', 'pageshow', 'focus'].forEach(function (ev) {
    win.addEventListener(ev, function () { unpark(ev); }, { passive: true });
  });
  doc.addEventListener('visibilitychange', function () {
    root.classList.toggle('shv-blurred', doc.hidden);
    if (doc.hidden) unpark('hidden');
  });
  try {
    if (win.addEventListener) win.addEventListener('pagehide', function () { unpark('pagehide'); });
  } catch (e) {}

  /* ── 2 · nothing in front of the shopper stays blank ──────────────────── */
  var view = doc.getElementById('view');
  function wakeVisible() {
    if (NOFX) return;
    var scope = doc.getElementById('view') || doc;
    var imgs = scope.querySelectorAll('img');
    if (!imgs.length) return;
    var vh = win.innerHeight || 800, w = win.innerWidth || 400;
    var n = 0;
    for (var i = 0; i < imgs.length && n < 40; i++) {
      var img = imgs[i];
      if (img.complete && img.naturalWidth) continue;
      var r;
      try { r = img.getBoundingClientRect(); } catch (e) { continue; }
      if (r.bottom < -120 || r.top > vh + 120 || r.right < -120 || r.left > w + 120) continue;
      n++;
      if (img.getAttribute('decoding') !== 'async') img.setAttribute('decoding', 'async');
      /* asking for it is all this does: it can never re-point a picture */
      if (img.getAttribute('loading') === 'lazy') { img.loading = 'eager'; stats.forced++; }
      if (!img.getAttribute('src') && img.getAttribute('data-src')) {
        img.src = img.getAttribute('data-src'); stats.woken++;
      }
    }
  }
  var wakeT = 0;
  function queueWake(ms) {
    if (wakeT) return;
    wakeT = setTimeout(function () { wakeT = 0; try { wakeVisible(); } catch (e) {} }, ms || 260);
  }
  try {
    if (win.MutationObserver && view) new MutationObserver(function () { queueWake(320); })
      .observe(view, { childList: true });
  } catch (e) {}
  win.addEventListener('scroll', function () { queueWake(420); }, { passive: true });
  win.addEventListener('load', function () { queueWake(120); });
  queueWake(700);
  setTimeout(wakeVisible, 2000);
  setTimeout(wakeVisible, 4500);

  /* ── 3 · a scroll that is not a scroll ────────────────────────────────── */
  /* A page whose document is shorter than its content reports scrollHeight
     equal to the viewport, and the finger does nothing. Nothing in this layer
     can create that any more; this only reports it. */
  function scrollable() {
    var max = root.scrollHeight - root.clientHeight;
    var viewEl = doc.getElementById('view');
    var cards = doc.querySelectorAll('#view .p-card, #view .cat-card, #view .ugc-card').length;
    return { max: max, cards: cards, parked: root.classList.contains('shv-scrolling'), nfx: NOFX };
  }

  /* ── 4 · the audit a report needs ─────────────────────────────────────── */
  function audit() {
    stats.audits++;
    var imgs = (doc.getElementById('view') || doc).querySelectorAll('img');
    var blank = 0, total = 0, cv = 0;
    var vh = win.innerHeight || 800;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i]; total++;
      var r = null;
      try { r = im.getBoundingClientRect(); } catch (e) {}
      if (!r || r.bottom < 0 || r.top > vh) continue;
      if (!im.complete || !im.naturalWidth) blank++;
    }
    try {
      var all = doc.querySelectorAll('*');
      for (var j = 0; j < all.length && j < 1200; j++) {
        var cs = win.getComputedStyle(all[j]);
        if (cs && cs.contentVisibility && cs.contentVisibility !== 'visible') cv++;
      }
    } catch (e) {}
    var out = {
      route: location.hash || '#/',
      scroll: scrollable(),
      imagesInView: blank,
      imagesTotal: total,
      skipped: cv,
      parked: root.classList.contains('shv-scrolling'),
      repaint: stats,
      viewport: (win.innerWidth || 0) + '×' + (win.innerHeight || 0),
      dpr: win.devicePixelRatio || 1
    };
    return out;
  }

  win.Shivaa = win.Shivaa || {};
  win.Shivaa.v245 = {
    audit: audit,
    unpark: unpark,
    wake: wakeVisible,
    stats: stats,
    get nfx() { return NOFX; }
  };
  /* with ?perfdiag=1 the panel from v244 gets one more line */
  try {
    if (/[?&]perfdiag=1/.test(location.search || '')) {
      setTimeout(function () {
        var box = doc.getElementById('shvPerfDiag');
        if (!box) return;
        var a = audit();
        var d = doc.createElement('div');
        d.style.cssText = 'margin-top:6px;color:#e4c97e';
        d.textContent = 'scrollable ' + a.scroll.max + 'px · cards ' + a.scroll.cards +
          ' · blank ' + a.imagesInView + '/' + a.imagesTotal + ' · skipped ' + a.skipped;
        box.appendChild(d);
      }, 2500);
    }
  } catch (e) {}
})();
