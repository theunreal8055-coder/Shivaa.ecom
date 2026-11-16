/* ═══════════════════════════════════════════════════════════════════════════
   v248 · “INSTANT” — the time between a tap and the next page.

   The owner's report, verbatim: “whenever you click any option or any button it
   waits for 3 seconds and then starts loading the next page, why does it lag for
   3 seconds and it feels stuck”.

   Three seconds is not a rendering problem, it is a deferral: something stands
   between the tap and `location.hash`. In this shop there were exactly three
   things that could, and all three are gone now (see the diff of v248):

     1 · `startViewTransition` for navigation (js/v226.js). It called
         preventDefault() on the link, rasterised a snapshot of the old page,
         and only then set the hash — inside its callback, behind a 300 ms cap
         and an rAF. Off by default now (`?vt=1` brings it back for testing).
     2 · `window.scrollTo({top:0})` under `html{scroll-behavior:smooth}` — the
         new page rendered at the OLD scroll offset and then glided up, so a tap
         looked like “nothing … nothing … it starts”. The router asks for
         `behavior:'instant'` explicitly, and this layer holds `scroll-behavior:
         auto` for 700 ms around any navigation so no later layer can undo it.
     3 · rail centring (a smooth scrollIntoView) on the very chip that was about
         to be replaced by another page. Skipped for anything that navigates.

   What this file adds, so the next report is evidence instead of adjectives:

     · A TAP METER. Every tap is timed from pointerdown to hashchange to the
       first mutation of #view to the first frame after the paint, into a ring of
       12. `window.Shivaa.taps()` returns them; `?tapdiag=1` draws the last one
       on screen in large type so the owner can screenshot it. Long tasks (main
       thread blockades over 50 ms) are recorded too, with the worst first:
       that is what a “3 second freeze” actually is when it is not a deferral.

     · STILL DURING A FLING. While the page reports a live gesture
       (`html.shv-scrolling`, set by v244) entrance animations and image fades
       are switched off. Content that arrives under a moving thumb should be
       THERE, not easing in — and a phone that is animating thirty cards while
       you scroll is a phone that is not responding to your thumb.

   Rules kept: no layout read outside a tap (the meter reads nothing that forces
   layout), passive listeners, nothing hidden, nothing deferred. With JS off the
   site is complete — it simply has no numbers to report.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvInstant) return;
  window.__shvInstant = true;

  var doc = document, root = doc.documentElement;
  var view = doc.getElementById('view');
  var DIAG = /[?&]tapdiag=1/.test(location.search);
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  /* ── 0 · nothing between the tap and the page ─────────────────────────────
     A capture-phase listener on the document runs before any app handler. It
     does one thing: for 700 ms the document may not animate its scroll, so the
     router's `scrollTo(top)` is a jump even if some layer re-declares
     `scroll-behavior: smooth` on html or body. */
  var navT = 0;
  function navWindow() {
    root.classList.add('shv-nav');
    clearTimeout(navT);
    navT = setTimeout(function () { root.classList.remove('shv-nav'); }, 700);
  }
  function isControl(el) {
    return !!(el && el.closest && el.closest('a[href],button,[role="button"],summary,label'));
  }
  doc.addEventListener('pointerdown', function (e) {
    if (isControl(e.target)) navWindow();
  }, { capture: true, passive: true });
  /* a keyboard Enter, a very old Safari and every test harness arrive without a
     pointerdown — the window must still be held */
  doc.addEventListener('click', function (e) {
    if (isControl(e.target)) navWindow();
  }, { capture: true, passive: true });

  /* ── 1 · the tap meter ────────────────────────────────────────────────────
     t0 → hashchange → first #view mutation → first frame after it.
     `pointerdown` is used rather than `click` because a phone fires it ~90 ms
     sooner and the shopper's clock starts at the finger, not at the click.

     The MutationObserver has to exist BEFORE the router runs: route() replaces
     #view synchronously inside the hashchange dispatch, so a listener registered
     after app.js's would set up its observer one task too late and see nothing.
     Observing from the moment of the press is also the honest measurement — it
     is the exact instant the old page stopped being the page. */
  var taps = [];
  var cur = null;
  var MAX = 12;

  function label(el) {
    if (!el) return '?';
    var a = el.closest ? (el.closest('a[href]') || el.closest('button') || el) : el;
    var x = (a.getAttribute && (a.getAttribute('aria-label') || a.textContent) || '').trim().replace(/\s+/g, ' ');
    return (a.tagName || '').toLowerCase() + (x ? ' “' + x.slice(0, 34) + '”' : '');
  }

  function begin(e) {
    var t = {
      at: now(),
      what: label(e.target),
      hash: location.hash,
      hashMs: null,
      viewMs: null,
      paintMs: null,
      done: false,
      _mo: null
    };
    cur = t;
    var settled = false;
    function settle() {
      if (settled || t.done) return;
      settled = true;
      if (t._mo) { try { t._mo.disconnect(); } catch (err) {} t._mo = null; }
      var later = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
      later(function () {
        t.paintMs = Math.round(now() - t.at);
        t.done = true;
        push(t);
      });
    }
    if (view) {
      try {
        var mo = new MutationObserver(function () {
          if (t.viewMs === null) {
            t.viewMs = Math.round(now() - t.at);
            settle();
          }
        });
        mo.observe(view, { childList: true });
        t._mo = mo;
      } catch (err) { t._mo = null; }
    }
    /* a press that changes nothing (a sheet, a toggle) still gets measured: the
       number that matters then is how long the press took to be ANSWERED */
    setTimeout(function () {
      if (t.viewMs === null) settle();
    }, 1200);
  }

  doc.addEventListener('pointerdown', begin, { capture: true, passive: true });
  /* fallback for a device (or an emulator) with no pointer events: the clock
     starts at the click instead of the finger. Fewer milliseconds are recorded,
     never a wrong one — a real pointerdown clears and replaces `cur`. */
  doc.addEventListener('click', function (e) {
    if (!cur || cur.done) begin(e);
  }, { capture: true, passive: true });

  addEventListener('hashchange', function () {
    if (cur && !cur.done && cur.hashMs === null) cur.hashMs = Math.round(now() - cur.at);
  }, { passive: true });

  function push(t) {
    if (taps.length && taps[taps.length - 1] === t) return;
    taps.push(t);
    if (taps.length > MAX) taps.shift();
    if (t === cur) cur = null;
    if (DIAG) draw(t);
  }

  /* ── 2 · long tasks — the freeze itself ─────────────────────────────────
     A “3 second freeze” that is not a deferral is the main thread doing
     something for three seconds. Where the browser reports it, it is recorded
     with a duration and a start time, so the report can be read instead of
     guessed. Not supported everywhere: the list is simply empty there. */
  var longTasks = [];
  try {
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes &&
        PerformanceObserver.supportedEntryTypes.indexOf('longtask') >= 0) {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (en) {
          longTasks.push({ at: Math.round(en.startTime), ms: Math.round(en.duration) });
          if (longTasks.length > 20) longTasks.shift();
        });
      }).observe({ entryTypes: ['longtask'] });
    }
  } catch (e) {}

  /* ── 3 · still during a fling ────────────────────────────────────────────
     css/v248.css does the work off `html.shv-scrolling`, and v244 owns that
     class (it is in the same bundle, so it is always there). No timer here: a
     second writer of the same class could only disagree with the first, and the
     `?nofx=1` kill switch must leave gestures completely alone. */

  /* ── 4 · the report ──────────────────────────────────────────────────── */
  function worst() {
    var t = taps.slice().sort(function (a, b) { return (b.paintMs || b.hashMs || 9999) - (a.paintMs || a.hashMs || 9999); });
    return t[0] || null;
  }
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.taps = function () {
    return taps.map(function (t) {
      return {
        what: t.what,
        from: t.hash,
        press: Math.round(t.at),
        hashMs: t.hashMs,
        viewMs: t.viewMs,
        paintMs: t.paintMs,
        longTasks: longTasks.slice()
      };
    });
  };
  window.Shivaa.v248 = {
    get taps() { return taps.length; },
    worst: worst,
    longTasks: function () { return longTasks.slice(); },
    /** one line the owner can copy into a message */
    report: function () {
      var w = worst();
      if (!w) return 'no taps recorded yet — tap any button, then run Shivaa.v248.report() again';
      return 'last tap ' + (w.what || '?') +
        ' · press→hash ' + (w.hashMs == null ? '—' : w.hashMs + ' ms') +
        ' · hash→page ' + (w.viewMs == null ? '—' : (w.viewMs - w.hashMs) + ' ms') +
        ' · press→paint ' + (w.paintMs == null ? '—' : w.paintMs + ' ms') +
        ' · long tasks ' + (longTasks.length ? longTasks.map(function (l) { return l.ms + 'ms@' + l.at; }).join(' ') : 'none') +
        ' · release ' + (window.__SHIVAA_REL || 0);
    }
  };

  /* ── 5 · ?tapdiag=1 — the numbers, on the screen, big ────────────────── */
  var box = null;
  function draw(t) {
    if (!DIAG) return;
    if (!box) {
      box = doc.createElement('div');
      box.id = 'tapDiag';
      box.setAttribute('aria-live', 'polite');
      doc.body.appendChild(box);
    }
    var lt = longTasks.length ? ' · long ' + longTasks.slice(-3).map(function (l) { return l.ms + 'ms'; }).join(' ') : '';
    box.innerHTML = '<b>' + (t.hashMs == null ? 'no page change' : (t.paintMs || t.viewMs || 0) + ' ms') + '</b>'
      + '<span>' + (t.what || '?') + '</span>'
      + '<span>press→hash ' + (t.hashMs == null ? '—' : t.hashMs) + ' ms · hash→page '
      + (t.viewMs == null ? '—' : (t.viewMs - t.hashMs)) + ' ms' + lt + '</span>'
      + '<span>Shivaa.v248.report() · ' + (window.__SHIVAA_REL || 0) + '</span>';
  }
})();
