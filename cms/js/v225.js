/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · v225 — one scroll frame
   ───────────────────────────────────────────────────────────────────────
   Three listeners were doing scroll work on separate rAF callbacks:

     · app.js:11536  toggles the header's .scrolled / .compact classes  (reads
                     scrollY only — left exactly as it is, hysteresis included)
     · app.js:5310   writes #scrollProg, toggles #backTop — and read
                     scrollHeight + clientHeight on EVERY FRAME
     · aurum.js:294  writes --au-p on #backTop and read scrollHeight on EVERY
                     FRAME before doing its parallax

   The height of the document cannot change while a thumb is moving, so both
   of those reads were the same number re-derived sixty times a second, on the
   main thread, next to the paint the phone was trying to finish. On a slow
   device that is the second-biggest cost after the animations v224 removed.

   v225 puts the chrome's scroll work in ONE place:

     · one passive listener, one rAF per frame, and the geometry measured only
       when it can actually change — resize, route, a document that grew, and
       three late passes for fonts and first images;
     · #scrollProg written through a quantised width (0.1%) and #backTop's
       conic ring through a quantised 1/120 of a turn, so a property that has
       to repaint repaints 120 times across a whole page instead of once per
       frame;
     · window.__shvHub exposes the cached maximum and the current fraction, so
       app.js and aurum.js read a number instead of the document.

   The parallax in aurum.js also stops measuring mid-frame: it caches each
   media element's offset once and only re-measures when the hub reports the
   document changed shape. Net effect on a scroll frame: zero layout reads.
   ─────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__shvHub) return;                 /* never install a second one */

  var root = document.documentElement;
  var bar = null, top = null;
  var queued = false, frames = 0, measures = 0;
  var max = 1;                                  /* cached document geometry */
  var lastBar = -1, lastRing = -1, lastShow = null;
  var reduceMQ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = !!(reduceMQ && reduceMQ.matches);

  function measure() {
    measures++;
    var m = root.scrollHeight - root.clientHeight;
    max = m > 1 ? m : 1;
    return max;
  }

  function frame() {
    queued = false;
    frames++;
    if (!bar) bar = document.getElementById('scrollProg');
    if (!top) top = document.getElementById('backTop');
    var y = window.scrollY || root.scrollTop || 0;
    var p = y / max;
    if (p < 0) p = 0; else if (p > 1) p = 1;

    /* the hairline: a transform, which the compositor runs without help, and
       quantised to a tenth of a percent so the string only changes when the
       bar would move by more than a pixel */
    var barStep = Math.round(p * 1000);
    if (bar && barStep !== lastBar) {
      lastBar = barStep;
      bar.style.transform = 'scaleX(' + (barStep / 1000).toFixed(3) + ')';
    }
    /* the ring: a conic-gradient, so every distinct value is a repaint. 120
       steps is finer than the eye can follow on a 42px button */
    var ringStep = Math.round(p * 120);
    if (ringStep !== lastRing) {
      lastRing = ringStep;
      if (top) top.style.setProperty('--au-p', (ringStep / 120).toFixed(3));
    }
    /* the button itself: one class toggle per band crossing, never per frame */
    var wantShow = y > 640;
    if (wantShow !== lastShow) {
      lastShow = wantShow;
      if (top) top.classList.toggle('show', wantShow);
    }
  }

  function queue() { if (!queued) { queued = true; window.requestAnimationFrame(frame); } }

  window.__shvHub = {
    queue: queue,
    frame: frame,
    measure: measure,
    reduced: reduced,
    get max() { return max; },
    get y() { return window.scrollY || root.scrollTop || 0; },
    get p() { var v = (window.scrollY || root.scrollTop || 0) / max; return v < 0 ? 0 : v > 1 ? 1 : v; },
    get frames() { return frames; },
    get measures() { return measures; }
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', function () { measure(); queue(); }, { passive: true });
  window.addEventListener('hashchange', function () { measure(); setTimeout(measure, 450); });
  /* the document grew or shrank — a route rendered, a film woke, a filter
     re-sliced the grid. The observer fires on its own schedule; no scroll
     frame ever asks the layout */
  try {
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { measure(); });
      if (document.body) ro.observe(document.body);
    }
  } catch (e) {}
  /* fonts, first images and the lazy-load sweep settle after DOMContentLoaded */
  setTimeout(measure, 900);
  setTimeout(measure, 2600);
  setTimeout(measure, 6000);
  queue();
})();
