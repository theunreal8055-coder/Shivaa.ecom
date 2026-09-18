/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v140 — install-chip removal + automatic landing guard (18 Sep 2026).
   Additive and self-guarding: nothing here can block or re-route the
   storefront, and the automatic landing itself lives in app.js (welcomeSession)
   — this file only carries the self-heal that is safe to run early and last.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  /* ── 1 · INSTALL CHIP — never again ──────────────────────────────────────
     The owner's report: a small pop-up says "keep shivaa on your home
     screen"; tapping its cross first shifts it aside, then back to centre,
     and it never really goes. v140 deletes the chip for good (js/v119.js and
     the matching CSS), so it can never be built again. This self-heal removes
     a bar that an older cached script already painted on some device, so the
     bad experience ends everywhere on the first v140 load. */
  function stripInstallChip() {
    var el = document.getElementById('shvInstallChip');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  stripInstallChip();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stripInstallChip, { once: true });
  }

  /* ── 2 · LANDING SAFETY — never trap a jeweller in a redirect loop ──────
     welcomeSession() in app.js sends a signed-in partner on a bare URL to
     #/partner (the live Bullion Desk). If anything ever interrupted that
     hand-off (a sandboxed preview, an odd history entry), re-affirm it once
     after the first paint — only while the URL is still bare, so a deliberate
     navigation is never fought. Retail customers and signed-out visitors are
     left exactly where they are. */
  function reassertLanding() {
    var bare = !location.hash || location.hash === '#/' || location.hash === '#/home';
    if (!bare) return;
    try {
      var user = (window.Shivaa && window.Shivaa.state && window.Shivaa.state.user) || null;
      if (user && user.role === 'partner') location.hash = '#/partner';
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('load', function () { setTimeout(reassertLanding, 0); }, { once: true });
  }
})();
