/* ═══════════════════════════════════════════════════════════════════════════
   v249 · “STEADY” — the instruments for a blink, and the last guard against one.

   The owner, verbatim: “Screen blinks and still slow loading.”

   The blink is answered in three places, all of them removals:

     · css/v249.css — nothing that is content may start at `opacity: 0` and fade
       in. Entrance motion travels; it does not fade up from nothing. The route
       rise, the `.rv` reveals, the review rows and the picture fade all lost
       their invisible first keyframe.
     · index.html + `html.shv-warm` — the maroon curtain is not painted at all
       for a device that already holds the catalogue, so a reload goes straight
       to the page instead of flashing a splash over it.
     · js/app.js + js/v166.js — a late boot batch and a background catalogue
       repair no longer rewrite #view. They adopt the data and patch the
       `.js-price` slots in place. A second full render was the biggest blink
       and the biggest duplicate download in the product.

   This file is what is left: it counts the blinks that still happen, so the next
   report can say “the view was replaced twice without a tap” instead of “it
   blinks”, and it stops the one case the CSS cannot: a repaint that arrives
   under the shopper's thumb. If #view is replaced while a gesture is in flight,
   the replacement is deferred to the next calm frame — the same rule v242 wrote
   for the boot batch, applied to every renderer.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvSteady) return;
  window.__shvSteady = true;

  var doc = document, root = doc.documentElement;
  var view = doc.getElementById('view');
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  /* ── 1 · what the page already knows about itself ─────────────────────── */
  var warm = root.classList.contains('shv-warm');
  var curtainPainted = !warm && !!doc.getElementById('preloader');

  /* ── 2 · count view replacements that no tap asked for ────────────────────
     A replacement within 1.2 s of a tap is a navigation. A replacement with no
     tap behind it is a repaint — and a repaint is what a shopper sees as the
     screen blinking. Each one is recorded with the time since the page opened
     and whether a gesture was in flight. */
  var renders = [];
  var lastTap = 0;
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
    addEventListener(ev, function () { lastTap = now(); }, { passive: true, capture: true });
  });

  function note(why) {
    var t = Math.round(now());
    renders.push({ at: t, sinceTap: lastTap ? Math.round(t - lastTap) : null, gesture: root.classList.contains('shv-scrolling'), why: why });
    if (renders.length > 10) renders.shift();
    return t;
  }

  if (view && window.MutationObserver) {
    var t0 = now();
    var armed = false;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].addedNodes && list[i].addedNodes.length) {
          /* the first fill of the skeleton is the page opening, not a blink */
          if (!armed) { armed = true; return; }
          note('view replaced');
          return;
        }
      }
    }).observe(view, { childList: true });
    void t0;
  }

  /* ── 3 · a render may not land under a thumb ─────────────────────────────
     Nothing in this release should be repainting the view, so this is a belt:
     any renderer that still rewrites #view while a gesture is live or a press
     was registered in the last 400 ms is deferred until the page is still. The
     router itself (`route()` on a real hashchange) is never touched — this hooks
     only the *programmatic* doors: Shivaa.redraw() and boot()'s calm repaint. */
  function calm() {
    return !root.classList.contains('shv-scrolling') && (!lastTap || now() - lastTap > 400);
  }
  function deferUntilCalm(fn) {
    var tries = 0;
    (function step() {
      if (calm() || ++tries > 40) { fn(); return; }
      setTimeout(step, 150);
    })();
  }
  try {
    var S = window.Shivaa;
    if (S && typeof S.redraw === 'function' && !S.__v249redraw) {
      var raw = S.redraw;
      S.redraw = function () {
        var args = arguments, self = this;
        if (calm()) return raw.apply(self, args);
        deferUntilCalm(function () { raw.apply(self, args); });
        return undefined;
      };
      S.__v249redraw = true;
    }
  } catch (e) {}

  /* ── 4 · the report ─────────────────────────────────────────────────────
     One line, in the same shape as Shivaa.v248.report(), so the two can sit in
     the same message and answer different halves of the question:
       v248 = how long did a tap take
       v249 = how many times did the page redraw itself, and was the curtain up */
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v249 = {
    warm: warm,
    curtainPainted: curtainPainted,
    renders: function () { return renders.slice(); },
    report: function () {
      var strange = renders.filter(function (r) { return r.sinceTap === null || r.sinceTap > 1200; });
      return 'steady ' + (window.__SHIVAA_REL || 0) +
        ' · start ' + (warm ? 'warm (no curtain)' : (curtainPainted ? 'cold (curtain)' : 'cold')) +
        ' · unasked repaints ' + strange.length + '/' + renders.length +
        (strange.length ? ' [' + strange.map(function (r) { return r.at + 'ms' + (r.gesture ? '/gesture' : ''); }).join(' ') + ']' : '') +
        ' · ' + (window.Shivaa.v248 && window.Shivaa.v248.report ? '' : '');
    }
  };
})();
