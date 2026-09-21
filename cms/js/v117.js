/* ═══════════════════════════════════════════════════════════
   SHIVAA v117 — "butter" release layer (JavaScript)
   1 · preloader hard-cap — a hung request can never park the shop
       on the splash screen again
   2 · enhancement scripts (aurum · motion · boost ≈ 110 KB) move
       OUT of the critical path: they are injected after first paint,
       in their original order, async=false. They are all
       self-guarding ("no JS = fully visible") and register no routes,
       so nothing the shopper sees or touches depends on them at boot.
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {

  /* ── 1 · splash hard-cap ────────────────────────────────────
     app.js boot() already caps its own batch at 6 s; this is the belt-
     and-braces twin for the pathological case (script error mid-boot,
     an await that never returns). If the preloader is still up 6.5 s
     after DOMContentLoaded, drop it. */
  function capPreloader() {
    setTimeout(function () {
      var pl = document.getElementById('preloader');
      if (pl && !pl.classList.contains('hide')) {
        pl.classList.add('hide');
        setTimeout(function () { if (pl.parentNode) pl.parentNode.removeChild(pl); }, 900);
      }
    }, 6500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', capPreloader, { once: true });
  else capPreloader();

  /* ── 2 · post-paint enhancement loader ──────────────────────
     v166 · the URLs ride the CURRENT release. They used to be frozen at the
     numbers of their own era (aurum/motion at ?v=107, boost at ?v=134) while
     sw.js precached the release-stamped copies — so the injection missed the
     warm cache AND, because `.htaccess` serves any ?v= URL immutably for a
     year, a returning device kept running the old animation code: the owner's
     "some animations or graphics are not loaded". */
  var REL = window.__SHIVAA_REL || 167;
  var IDLE = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };

  function inject(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;          // preserve execution order for the chain
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function loadEnhancements() {
    // order = the old static-defer order in index.html
    inject('/js/aurum.js?v=' + REL)
      .then(function () { return inject('/js/motion.js?v=' + REL); })
      .then(function () { return inject('/js/boost.js?v=' + REL); })
      .catch(function () { /* ambience is optional — never noisy */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      IDLE(loadEnhancements);
    }, { once: true });
  } else {
    IDLE(loadEnhancements);
  }

})();
