/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v120 — best-app mobile pack: haptics + back-button overlays.
   Additive and self-guarding: every block checks for its APIs and fails
   silent; nothing here can block or re-route the storefront. Runs after
   app.js (script order in index.html) and only touches window.Shivaa APIs
   plus overlay classes — the router, checkout and rates logic are untouched.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  var S = null;
  try { S = window.Shivaa || null; } catch (e) { S = null; }
  if (!S) return;

  /* ── 1 · HAPTICS — tiny vibrations that make taps feel physical.
     Add-to-bag thumps (20 ms), wishlist ticks (12 ms). No-ops on devices
     and desktops without a vibrator. Exposed as Shivaa.haptic(ms). */
  function haptic(ms) {
    try { if (navigator && typeof navigator.vibrate === 'function') navigator.vibrate(ms || 12); } catch (e) {}
  }
  try { S.haptic = haptic; } catch (e) {}
  function wrapTap(name, ms) {
    try {
      var fn = S[name];
      if (typeof fn !== 'function' || fn._shvHaptic) return;
      var wrapped = function () { haptic(ms); return fn.apply(this, arguments); };
      wrapped._shvHaptic = true;
      S[name] = wrapped;
    } catch (e) {}
  }
  wrapTap('addToCart', 20);
  wrapTap('toggleWish', 12);

  /* ── 2 · BACK BUTTON closes the top overlay instead of leaving the page.
     Every overlay open pushes a same-URL history entry (the hash never
     changes, so the router never fires); a Back press closes the topmost
     open layer — modal (incl. Quick View) → bag → search → menu → PDF.
     X-closes consume their own dead entry, but ONLY when the shopper is
     still on the same hash — a real navigation never gets bounced back.
     Any failure (sandboxed iframe, file://, ancient WebView) disables the
     whole block silently; Escape-key behaviour is unchanged. */
  var OVERLAYS = [
    { id: 'modal', isOpen: function () { var el = document.querySelector('#modalOverlay'); return !!(el && el.classList.contains('open')); },
      close: function () { try { S.closeModal(); } catch (e) {} } },
    { id: 'cart', isOpen: function () { var el = document.querySelector('#cartDrawer'); return !!(el && el.classList.contains('open')); },
      close: function () { try { S.closeCart(); } catch (e) {} } },
    { id: 'search', isOpen: function () { var el = document.querySelector('#searchDrawer'); return !!(el && el.classList.contains('open')); },
      close: function () { var b = document.querySelector('#searchClose'); if (b && b.click) { try { b.click(); } catch (e) {} } } },
    { id: 'nav', isOpen: function () { var el = document.querySelector('#mainNav'); return !!(el && el.classList.contains('open')); },
      close: function () { try { if (window._closeDrawer) window._closeDrawer(); else { var n = document.querySelector('#mainNav'); if (n) n.classList.remove('open'); } } catch (e) {} } },
    { id: 'pdf', isOpen: function () { var el = document.querySelector('#pdfViewer'); return !!(el && el.classList.contains('open')); },
      close: function () { var el = document.querySelector('#pdfViewer'); if (el) { try { el.classList.remove('open'); } catch (e) {} } } },
  ];
  function topOpen() {
    for (var i = 0; i < OVERLAYS.length; i++) {
      try { if (OVERLAYS[i].isOpen()) return OVERLAYS[i]; } catch (e) {}
    }
    return null;
  }
  var historyOK = true, pushed = 0, fromPop = false, expectPop = false;
  function pushEntry(id) {
    if (!historyOK) return;
    try { history.pushState({ shvOverlay: id }, ''); pushed++; }
    catch (e) { historyOK = false; }
  }
  window.addEventListener('popstate', function () {
    if (!historyOK) return;
    if (expectPop) { expectPop = false; pushed = Math.max(0, pushed - 1); return; }  // our own cleanup back()
    var top = topOpen();
    if (top) {
      fromPop = true;
      try { top.close(); } catch (e) {}
      pushed = Math.max(0, pushed - 1);
      setTimeout(function () { fromPop = false; }, 0);
    } else if (pushed > 0) {
      pushed--;   // a dead entry (overlay was X-closed) — just consume it
    }
  });
  try {
    if (typeof MutationObserver === 'function' && document.documentElement) {
      var openHash = {};   // overlay id -> location.hash it opened on (false = closed)
      var mo = new MutationObserver(function () {
        if (!historyOK) return;
        for (var i = 0; i < OVERLAYS.length; i++) {
          var o = OVERLAYS[i], is = false;
          try { is = o.isOpen(); } catch (e) { is = false; }
          /* a Back-driven close still syncs state (else the next open would
             wrongly look "already open" and skip its entry) — it just skips
             the push/back accounting, which popstate already handled. */
          if (fromPop) { openHash[o.id] = is ? location.hash : false; continue; }
          if (is && !openHash[o.id]) { pushEntry(o.id); openHash[o.id] = location.hash; }
          else if (!is && openHash[o.id]) {
            var sameHash = (openHash[o.id] === location.hash);
            openHash[o.id] = false;
            if (window.__shvNavigating) {
              if (pushed > 0) pushed--;
            } else if (pushed > 0) {
              if (sameHash) { expectPop = true; try { history.back(); } catch (e) { expectPop = false; pushed--; } }
              else pushed--;   // a real navigation orphaned the entry; Back still lands correctly
            }
          }
        }
      });
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
  } catch (e) {}
})();
