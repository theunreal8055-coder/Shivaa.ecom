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
      /* ═══ v156 · BUG FIX — THE BACK BUTTON NEEDED *N* PRESSES ON HOME ═══
         A bare shivaa.in/ visit has an EMPTY location.hash, and the empty
         string is falsy. `openHash[o.id] = location.hash` therefore recorded
         NOTHING on the home page, so:
           (a) `if (is && !openHash[o.id])` stayed true on EVERY class mutation
               anywhere in the document while a sheet was open, and pushed
               ANOTHER history entry each time (instrumented in the v127
               session: 2+ pushStates for a single drawer open), and
           (b) the close branch `else if (!is && openHash[o.id])` never ran, so
               not one of those entries was ever released — a shopper who
               opened the menu on the home page had to press Back once per
               mutation to get out of the shop.
         Found and instrumented during the v127 navigation repair and left
         alone on purpose (that brief said do not touch this file); the owner's
         19 Sep 2026 order — "find some bugs in the app and solve" — is the
         ask that opens it. The hash is now normalised on BOTH sides of the
         comparison, so `sameHash` means exactly what it always meant and the
         navigation guard v127 relies on is untouched; only the empty-hash
         (home page) case changes. */
      var curHash = function () { return location.hash || '#/'; };
      var openHash = {};   // overlay id -> hash it opened on ('#/' when the URL carries none); false = closed
      var mo = new MutationObserver(function () {
        if (!historyOK) return;
        for (var i = 0; i < OVERLAYS.length; i++) {
          var o = OVERLAYS[i], is = false;
          try { is = o.isOpen(); } catch (e) { is = false; }
          /* a Back-driven close still syncs state (else the next open would
             wrongly look "already open" and skip its entry) — it just skips
             the push/back accounting, which popstate already handled. */
          if (fromPop) { openHash[o.id] = is ? curHash() : false; continue; }
          if (is && !openHash[o.id]) { pushEntry(o.id); openHash[o.id] = curHash(); }
          else if (!is && openHash[o.id]) {
            var sameHash = (openHash[o.id] === curHash());
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
