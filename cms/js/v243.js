/* ═══════════════════════════════════════════════════════════════
   SHIVAA v243 — "the header bar is not a drawer"

   THE OWNER, on a PC: "PC main header se jo categories thi vo sab ud
   chuki hain" — the category bar that used to sit under the logo is gone.

   WHY. #mainNav is ONE element doing TWO jobs:
     · ≤820 px → the side drawer: a column of full-width rows;
     · >820 px → the horizontal category bar inside the header, where each
       row is an equal flex link and the bar is 52 px tall.
   v238 and v239 fixed the drawer's collapsed rows by writing styles onto
   those rows — and v239 wrote them INLINE (`width:100% !important`,
   `display:grid`) with no viewport check, while v240's cleanup deliberately
   kept `width:100% !important`. Inline beats all 71 cascade layers, so on a
   laptop nine links each demanded the full width of the bar: the bar had no
   room for them and the categories effectively disappeared. On a phone the
   same styles are exactly right, which is why nobody saw it.

   WHAT THIS FILE DOES
     1 · nothing on a phone — the drawer keeps the guard that finally fixed it;
     2 · on a desktop it removes every trace of the drawer work from the bar
        (row, label, sub-label), so the header is governed by the cascade
        exactly as it was designed;
     3 · it repeats that check on load, shortly after load, on resize and when
        the viewport crosses 820 px (rotate, dock, split-screen);
     4 · `?navdiag=1` (from v239) still prints row/pane measurements, now for
        whichever mode is on screen.

   It never hides, moves or creates an element: it only removes inline
   properties that should never have been on a desktop bar.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  var REL = window.__SHIVAA_REL || 243;
  var ROW = ['display', 'grid-template-columns', 'align-items', 'width', 'max-width',
             'box-sizing', 'min-width', 'flex', 'flex-direction'];
  var TX = ['min-width', 'width', 'max-width', 'display', 'flex'];
  var B = ['display', 'white-space', 'overflow', 'text-overflow', 'max-width'];
  var SM = ['display', '-webkit-box-orient', '-webkit-line-clamp', 'overflow',
            'word-break', 'overflow-wrap', 'max-width'];

  function barMode() {
    try { return !window.matchMedia || window.matchMedia('(min-width: 821px)').matches; }
    catch (e) { return innerWidth > 820; }
  }
  function strip(el, props) {
    if (!el || !el.style) return;
    for (var i = 0; i < props.length; i++) el.style.removeProperty(props[i]);
  }

  var cleaned = 0;
  function cleanBar() {
    if (!barMode()) return 0;
    var nav = document.getElementById('mainNav');
    if (!nav) return 0;
    var nodes = nav.querySelectorAll('.nav-scroll > a, .nav-scroll > button, .nav-scroll > div, .nav-jwl');
    var n = 0;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.style) continue;
      var had = el.style.cssText ? true : false;
      strip(el, ROW);
      var tx = el.querySelector && el.querySelector('.dw-tx');
      if (tx) {
        strip(tx, TX);
        strip(tx.querySelector('b'), B);
        strip(tx.querySelector('small'), SM);
      }
      el.__shvRowFixed = false;
      if (had) n++;
    }
    /* a drawer column left behind would also squeeze the bar */
    var scroll = nav.querySelector('.nav-scroll');
    if (scroll) strip(scroll, ['display', 'flex-direction', 'align-items', 'width']);
    cleaned += n;
    return n;
  }

  function run() { try { cleanBar(); } catch (e) {} }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  /* late layers (v166's retry, a cached older v239/v240) can plant styles a
     moment after this file runs: look again, then stop. */
  setTimeout(run, 400);
  setTimeout(run, 1500);
  setTimeout(run, 3500);
  window.addEventListener('load', run);

  try {
    var mq = window.matchMedia('(min-width: 821px)');
    var onChange = function () { run(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}

  var t = 0;
  window.addEventListener('resize', function () {
    if (t) return;
    t = setTimeout(function () { t = 0; run(); }, 180);
  }, { passive: true });

  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v243 = { cleanBar: cleanBar, barMode: barMode, cleaned: function () { return cleaned; } };
  try { document.documentElement.setAttribute('data-rel', String(REL)); } catch (e) {}
})();
