/* v194 — side-slide guard. Keeps the app inside the screen width on phones.
   CSS already clips the page; this script is the safety net for anything the
   CSS cannot see (sections rendered later, third-party widgets).
   It never touches fixed headers, bottom bars or overlays, and it does nothing
   when the page already fits. */
(function () {
  if (window.__v194) return;
  window.__v194 = true;

  var root = document.documentElement;
  var pending = 0;

  // 1. If the page is scrolled sideways, bring it back to the left edge.
  function resetSideways() {
    pending = 0;
    if (window.scrollX || root.scrollLeft) {
      window.scrollTo(0, window.scrollY);
      root.scrollLeft = 0;
      if (document.body) document.body.scrollLeft = 0;
    }
  }
  window.addEventListener('scroll', function () {
    if (!pending && (window.scrollX || root.scrollLeft)) {
      pending = requestAnimationFrame(resetSideways);
    }
  }, { passive: true });

  // 2. Clip any top-level block that is still wider than the screen.
  var timer = 0;
  function fit() {
    timer = 0;
    var W = root.clientWidth;
    if (!W || !document.body) return;
    var kids = document.body.children;
    for (var i = 0; i < kids.length && i < 400; i++) {
      var el = kids[i];
      if (el.nodeType !== 1) continue;
      var cs = window.getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') continue;
      if (el.scrollWidth > W + 1 && cs.overflowX === 'visible') {
        el.style.overflowX = 'clip';
      }
    }
  }
  function later(ms) {
    clearTimeout(timer);
    timer = setTimeout(fit, ms || 250);
  }

  window.addEventListener('resize', function () { later(250); }, { passive: true });
  window.addEventListener('orientationchange', function () { later(400); });
  window.addEventListener('hashchange', function () { later(600); });
  window.addEventListener('load', function () { later(300); });
  document.addEventListener('DOMContentLoaded', function () { later(300); });
})();
