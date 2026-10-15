/* v219 — "The Depth Release" (2026-10-14)
   1. Offer banners tilt toward a mouse pointer and a glare follows it.
      Mouse only: phones and touch screens are never tilted, so scrolling is
      never taken over. Writes go through one requestAnimationFrame per frame and
      only change two CSS variables on the card (no inline 3D transforms here).
   2. Offer banners that are off screen pause their sheen animation, so the
      page spends its frames on what the visitor can see.
   Passive listeners only. Nothing here blocks default behaviour. */
(function () {
  'use strict';

  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var fine = mq('(hover: hover) and (pointer: fine)');
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var cur = null, raf = 0, last = null;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function clear(card) {
    card.classList.remove('v219-tilt');
    var s = card.style;
    s.removeProperty('--v219-rx');
    s.removeProperty('--v219-ry');
    s.removeProperty('--v219-gx');
    s.removeProperty('--v219-gy');
    s.removeProperty('--v219-ax');
    s.removeProperty('--v219-ay');
  }

  function paint() {
    raf = 0;
    if (!cur || !last) return;
    var r = cur.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var px = clamp01((last.clientX - r.left) / r.width);
    var py = clamp01((last.clientY - r.top) / r.height);
    var s = cur.style;
    /* a small tilt: at most 7 degrees, so the text stays easy to read */
    s.setProperty('--v219-rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
    s.setProperty('--v219-ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
    s.setProperty('--v219-gx', (px * 100).toFixed(1) + '%');
    s.setProperty('--v219-gy', (py * 100).toFixed(1) + '%');
    /* the artwork band drifts against the tilt: its own, smaller layer */
    s.setProperty('--v219-ax', ((px - 0.5) * -6).toFixed(1) + 'px');
    s.setProperty('--v219-ay', ((py - 0.5) * -4).toFixed(1) + 'px');
  }

  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = e.target;
      var card = t && t.closest ? t.closest('.shv-offer-card') : null;
      if (card && card.classList.contains('v219-off')) card = null;
      if (card !== cur) {
        if (cur) clear(cur);
        cur = card;
        if (cur) cur.classList.add('v219-tilt');
      }
      if (cur) {
        last = e;
        if (!raf) raf = requestAnimationFrame(paint);
      }
    }, { passive: true });

    /* the pointer leaves the window: let the banner settle flat */
    window.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget && cur) { clear(cur); cur = null; }
    }, { passive: true });
  }

  /* pause the sheen when a banner is off screen */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('v219-off', !en.isIntersecting);
      });
    }, { rootMargin: '160px 0px' });
    var seen = new WeakSet();
    var watch = function () {
      document.querySelectorAll('.shv-offer-card').forEach(function (c) {
        if (seen.has(c)) return;
        seen.add(c);
        io.observe(c);
      });
    };
    watch();
    if ('MutationObserver' in window && document.body) {
      new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
    }
  }
})();
