/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · v244 — "butter on the PC" (the runtime half)

   css/v244.css takes the frame cost out of the scroll path. This file does
   the three things CSS cannot:

     1 · SCROLL GOVERNOR — sets `html.shv-scrolling` for the duration of a
         real gesture (and `html.shv-blurred` while the tab is hidden) so the
         stylesheet can park the repaint-heavy decoration. One passive
         listener, no layout read, one class toggle per gesture.

     2 · DECODE AHEAD — a picture that is decoded at the moment it reaches
         the screen is a picture that stutters the scroll. One
         IntersectionObserver with a 700 px margin asks for the bytes and
         decodes them ~a screen before they are needed, then lets go. It is
         re-armed on every route change, and it also sweeps `decoding=async`
         onto every image that arrived without it.

     3 · REMEMBER THE SCROLL — Back used to land at the top of the page you
         had just left, which reads as "the site forgot where I was". Each
         route's offset is kept for the session and restored when the browser
         goes back or forward to it.

   And, because "stutter" cannot be fixed by guessing: `?perfdiag=1` puts a
   live FPS / long-task / LCP / layout-shift readout in the corner with a
   copy button, so the owner can send one line instead of a description.

   Rules: no scroll handler that reads layout, transform/opacity/class only,
   every listener passive, nothing here touches money, routes or prices.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvButter2) return;
  window.__shvButter2 = true;

  var doc = document, root = doc.documentElement, win = window;
  var reduceMQ = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = !!(reduceMQ && reduceMQ.matches);

  var stats = { sweeps: 0, decodeAsked: 0, decoded: 0, gestures: 0, restored: 0, imgs: 0, warmedPdp: 0 };

  /* ── 1 · scroll governor ─────────────────────────────────────────────── */
  var scrollT = 0, scrolling = false;
  function parkOn() {
    if (!scrolling) { scrolling = true; stats.gestures++; root.classList.add('shv-scrolling'); }
    scheduleIdle();                        /* every event pushes the end out */
  }
  function parkOff() {
    if (!scrolling) return;
    scrolling = false;
    root.classList.remove('shv-scrolling');
  }
  function scheduleIdle() {
    if (scrollT) clearTimeout(scrollT);
    scrollT = setTimeout(parkOff, 190);
  }
  win.addEventListener('scroll', parkOn, { passive: true });
  win.addEventListener('wheel', parkOn, { passive: true });
  win.addEventListener('touchmove', parkOn, { passive: true });
  win.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp' ||
        e.key === 'Home' || e.key === 'End' || e.key === ' ') scheduleIdle();
  }, { passive: true });

  doc.addEventListener('visibilitychange', function () {
    root.classList.toggle('shv-blurred', doc.hidden);
  });
  if (doc.hidden) root.classList.add('shv-blurred');

  /* ── 2 · decode ahead ────────────────────────────────────────────────── */
  var view = doc.getElementById('view');
  var ioPics = null;
  try {
    if (win.IntersectionObserver) {
      ioPics = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var en = entries[i];
          if (!en.isIntersecting) continue;
          ioPics.unobserve(en.target);
          warm(en.target);
        }
      }, { rootMargin: '700px 0px 700px 0px' });
    }
  } catch (e) { ioPics = null; }

  function warm(img) {
    if (!img || img.tagName !== 'IMG') return;
    try {
      if (img.getAttribute('loading') === 'lazy') img.setAttribute('loading', 'eager');
      if (img.getAttribute('decoding') !== 'async') img.setAttribute('decoding', 'async');
      stats.decodeAsked++;
      /* decode() resolves once the pixels are ready; ignoring it is safe —
         the browser decodes on paint exactly as it would have. */
      var p = img.decode && img.decode();
      if (p && p.then) p.then(function () { stats.decoded++; }, function () {});
    } catch (e) {}
  }

  function sweep() {
    stats.sweeps++;
    var scope = doc.getElementById('view') || doc;
    var imgs = scope.querySelectorAll('img');
    stats.imgs = imgs.length;
    var first = true;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.getAttribute('decoding') !== 'async') img.setAttribute('decoding', 'async');
      if (first && !img.getAttribute('fetchpriority')) {
        /* the one picture above the fold is the one worth asking for first */
        if (!img.getAttribute('loading') || img.getAttribute('loading') !== 'lazy') {
          img.setAttribute('fetchpriority', 'high'); first = false;
        }
      }
      if (ioPics) ioPics.observe(img);
    }
  }

  /* a route render replaces #view wholesale: re-arm once the DOM settles */
  var sweepT = 0;
  function queueSweep() {
    if (sweepT) return;
    sweepT = setTimeout(function () { sweepT = 0; try { sweep(); } catch (e) {} }, 120);
  }
  try {
    if (win.MutationObserver) {
      new MutationObserver(queueSweep).observe(view || doc.body, { childList: true, subtree: false });
    }
  } catch (e) {}
  sweep();
  setTimeout(sweep, 900);
  setTimeout(sweep, 2600);

  /* ── 2b · the picture of the piece you are about to open ─────────────── */
  /* app.js already warms the product's JSON the moment a pointer or a thumb
     lands on a card (v186). The JSON arrives in ~40 ms; the photograph does
     not, and a product page that shows its jewellery 300 ms after the tap
     reads as slow even though everything else was instant. On the same
     intent, ask the browser for that one picture — it is the same URL the
     product page is about to request, so the browser cache serves it and
     nothing is downloaded twice. */
  var warmedImg = Object.create(null);
  function warmProductImage(target) {
    try {
      if (!target || !target.closest) return;
      var a = target.closest('a[href*="#/product/"]');
      if (!a) return;
      var m = (a.getAttribute('href') || '').match(/#\/product\/([^/?#]+)/);
      if (!m) return;
      var id = decodeURIComponent(m[1]);
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || warmedImg[id]) return;
      var st = win.Shivaa && win.Shivaa.state;
      var list = st && st.productsCache;
      if (!list || !list.length) return;
      var p = null;
      for (var i = 0; i < list.length; i++) { if (list[i] && list[i].id === id) { p = list[i]; break; } }
      if (!p || !p.images || !p.images.length) return;
      var src = p.images[0];
      if (typeof src !== 'string' || !src) return;
      warmedImg[id] = 1;
      var im = new Image();
      im.decoding = 'async';
      im.src = src;
      stats.warmedPdp++; stats.decodeAsked++;
      if (im.decode) im.decode().then(function () {}, function () {});
    } catch (e) {}
  }
  ['pointerover', 'pointerdown', 'touchstart', 'focusin'].forEach(function (ev) {
    doc.addEventListener(ev, function (e) { warmProductImage(e.target); }, { passive: true });
  });

  /* ── 3 · remember where the shopper was ──────────────────────────────── */
  var mem = Object.create(null), memHash = location.hash || '#/', memY = 0, memQueued = false;
  win.addEventListener('scroll', function () {
    if (memQueued) return;
    memQueued = true;
    win.requestAnimationFrame(function () {
      memQueued = false;
      if ((location.hash || '#/') !== memHash) { memHash = location.hash || '#/'; memY = 0; }
      memY = win.scrollY || root.scrollTop || 0;
      mem[memHash] = memY;
    });
  }, { passive: true });

  var backTo = null;
  win.addEventListener('popstate', function () {
    /* the browser fires popstate first, then hashchange (which is what the
       router listens to), so the restore has to wait for the render */
    var h = location.hash || '#/';
    var y = mem[h];
    backTo = (y && y > 40) ? { hash: h, y: y } : null;
    if (!backTo) return;
    [0, 60, 220, 520].forEach(function (d) {
      setTimeout(function () {
        if (!backTo || (location.hash || '#/') !== backTo.hash) return;
        var max = root.scrollHeight - root.clientHeight;
        if (max < backTo.y - 8) return;                 /* page still shorter than the memory */
        win.scrollTo(0, Math.min(backTo.y, max));
        stats.restored++;
      }, d);
    });
  });
  win.addEventListener('hashchange', function () {
    /* a fresh click is a fresh page: start at the top (the router already
       did) and forget any pending restore */
    if (!backTo || (location.hash || '#/') !== backTo.hash) backTo = null;
    memHash = location.hash || '#/';
  });

  /* ── 4 · ?perfdiag=1 — the owner's one-line report ───────────────────── */
  function perfDiag() {
    if (doc.getElementById('shvPerfDiag')) return;
    var live = { fps: 0, worstFrame: 0, longTasks: 0, worstTask: 0, lcp: 0, cls: 0, frames: 0 };
    var box = doc.createElement('div');
    box.id = 'shvPerfDiag';
    box.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:2147483000;max-width:min(92vw,360px);' +
      'background:#1d0509;color:#f6e8c8;border:1px solid rgba(212,175,90,.5);border-radius:12px;padding:10px 12px;' +
      'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 12px 40px rgba(0,0,0,.45);pointer-events:auto';
    box.innerHTML = '<b style="color:#e4c97e">Shivaa · perf</b> <span data-x style="float:right;cursor:pointer">✕</span>' +
      '<div data-body style="white-space:pre-wrap;margin-top:6px">…</div>' +
      '<button data-copy type="button" style="margin-top:8px;background:rgba(212,175,90,.18);color:#f6e8c8;' +
      'border:1px solid rgba(212,175,90,.45);border-radius:8px;padding:4px 10px;font:inherit;cursor:pointer">Copy report</button>';
    doc.body.appendChild(box);
    box.querySelector('[data-x]').onclick = function () { box.remove(); };

    var last = performance.now(), acc = 0, n = 0;
    (function tick(now) {
      var dt = now - last; last = now;
      if (dt < 5000) { acc += dt; n++; if (dt > live.worstFrame) live.worstFrame = dt; }
      live.frames++;
      if (n >= 20) { live.fps = Math.round(1000 / (acc / n)); acc = 0; n = 0; paint(); }
      win.requestAnimationFrame(tick);
    })(performance.now());

    try {
      new PerformanceObserver(function (l) {
        l.getEntries().forEach(function (e) {
          live.longTasks++; if (e.duration > live.worstTask) live.worstTask = Math.round(e.duration);
        });
        paint();
      }).observe({ entryTypes: ['longtask'] });
    } catch (e) {}
    try {
      new PerformanceObserver(function (l) {
        var es = l.getEntries(); var e = es[es.length - 1];
        if (e) { live.lcp = Math.round(e.startTime); }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {}
    try {
      new PerformanceObserver(function (l) {
        l.getEntries().forEach(function (e) { if (!e.hadRecentInput) live.cls += e.value; });
      }).observe({ entryTypes: ['layout-shift'] });
    } catch (e) {}

    function slowest() {
      try {
        var r = performance.getEntriesByType('resource').filter(function (x) {
          return /\.(jpe?g|png|webp|avif|css|js)(\?|$)/.test(x.name);
        }).sort(function (a, b) { return b.duration - a.duration; }).slice(0, 4);
        return r.map(function (x) { return '  ' + Math.round(x.duration) + 'ms ' + x.name.split('/').pop().slice(0, 40); }).join('\n');
      } catch (e) { return '  n/a'; }
    }
    var anims = 0;
    try { anims = doc.getAnimations ? doc.getAnimations().length : 0; } catch (e) {}

    function paint() {
      var body = box.querySelector('[data-body]');
      if (!body) return;
      body.textContent =
        'fps ' + live.fps + '  (worst frame ' + Math.round(live.worstFrame) + 'ms)\n' +
        'long tasks ' + live.longTasks + '  (worst ' + live.worstTask + 'ms)\n' +
        'LCP ' + live.lcp + 'ms   CLS ' + live.cls.toFixed(3) + '\n' +
        'animations ' + anims + '   imgs ' + stats.imgs + '\n' +
        'rolling ' + (scrolling ? 'yes' : 'no') + '   route ' + (location.hash || '#/') + '\n' +
        'slowest:\n' + slowest();
    }
    box.querySelector('[data-copy]').onclick = function () {
      var txt = 'Shivaa perf · ' + new Date().toISOString() + '\n' +
        'route ' + (location.hash || '#/') + ' · ' + (navigator.userAgent || '') + '\n' +
        box.querySelector('[data-body]').textContent + '\n' +
        'viewport ' + innerWidth + '×' + innerHeight + ' dpr ' + (devicePixelRatio || 1) + '\n' +
        'cores ' + (navigator.hardwareConcurrency || '?') + ' mem ' + (navigator.deviceMemory || '?') + 'GB\n' +
        'decodes ' + stats.decodeAsked + '/' + stats.decoded + ' sweeps ' + stats.sweeps;
      var done = function () {
        var b = box.querySelector('[data-copy]'); b.textContent = 'Copied ✓';
        setTimeout(function () { b.textContent = 'Copy report'; }, 1400);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
        else throw 0;
      } catch (e) {
        var ta = doc.createElement('textarea'); ta.value = txt; doc.body.appendChild(ta); ta.select();
        try { doc.execCommand('copy'); done(); } catch (_) {}
        ta.remove();
      }
    };
    paint();
  }
  try {
    if (/[?&]perfdiag=1/.test(location.search)) perfDiag();
  } catch (e) {}

  /* ── expose for the tests, never for the shopper ─────────────────────── */
  win.Shivaa = win.Shivaa || {};
  win.Shivaa.v244 = {
    stats: stats,
    sweep: sweep,
    warmAll: function () { var im = doc.querySelectorAll('#view img'); for (var i = 0; i < im.length; i++) warm(im[i]); },
    get scrolling() { return scrolling; },
    get reduced() { return reduced; }
  };
})();
