/* ══════════════════════════════════════════════════════════════════════
   SHIVAA v139 — the bag drawer's own tap layer + two tidiness repairs.

   Owner report (18 Sep 2026, verbatim): *"the check out button whenever
   someone adds anything to the card then the side bar appears … and the check
   out button doesn't work and doesn't take us to the payment page"*.

   ── THE DEFECT, PROVEN BEFORE IT WAS FIXED ─────────────────────────────
   An instrumented run of the shipped tree (tools/mega/smoke/probe-owner-issues.js,
   kept with the release) taps `.mc-foot a[href="#/checkout"]` in the bag
   drawer and records:

       hash after tap  : "#/checkout"     ← the link DID fire
       history.back()  : 1                ← and a traversal was queued
       body[data-page] : checkout
       #view starts    : <section class="hero">   ← the HOME page is on screen
       login modal     : not open

   So the tap is not dead at all — it is *out-raced*. app.js closes the drawer
   inside the click:

       wrap.addEventListener('click', e => {
         if (e.target.closest('[data-mc-close]')) closeCart(); });

   and js/v120.js watches overlay classes: when a sheet closes while the hash
   is unchanged it calls history.back() to release the history entry the open
   pushed. Closing the bag happens BEFORE the anchor's own default action sets
   the hash, so the traversal is queued first and wins — the shopper is thrown
   back to the entry that was current when the bag opened, while the URL still
   reads #/checkout. That is precisely "the checkout button doesn't work".

   It is the same defect class v127 removed from the sidebar and the search
   palette. v127 deliberately covered only `#mainNav` and `#searchSugg`; the bag
   drawer (`#cartDrawer`) was never in scope. This layer gives the bag the same
   ownership: NAVIGATE FIRST, DISMISS SECOND, and arm `window.__shvNavigating`
   — the flag js/v120.js already honours — so no traversal can be queued
   against a navigation in flight.

   ── WHAT IS DELIBERATELY NOT TOUCHED ───────────────────────────────────
   · "Continue shopping" (a <button>, no href) still closes the bag the old
     way: nothing is navigating, so v120's history.back() is CORRECT there — it
     releases the entry the open pushed and the Back button stays honest.
   · Ctrl/⌘/shift/alt-click and middle-click keep "open in a new tab".
   · No route, price, rate, API call or version stamp lives in this file.

   Additive and self-guarding: every block checks for its element and API. If
   this file never loads, the site behaves exactly as it did before.
   ══════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  /* ── the house navigation flag (the same one js/v120.js reads) ─────── */
  function arm(ms) {
    try {
      window.__shvNavigating = true;
      if (window.__shvNavArm) clearTimeout(window.__shvNavArm);
      window.__shvNavArm = setTimeout(function () { window.__shvNavigating = false; }, ms || 500);
    } catch (e) {}
  }

  function plainTap(e) {
    if (!e) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    return e.button === undefined || e.button === 0;
  }

  function haptic(ms) {
    try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(ms || 10); } catch (e) {}
  }

  var _lastRedraw = 0;
  function navigate(hash) {
    var target = String(hash || '');
    if (target.indexOf('#/') !== 0) return false;
    arm();
    try {
      if (window.location.hash === target) {
        /* no hashchange fires for the URL you are already standing on, so a
           second tap would do nothing at all — redraw instead, debounced so
           one tap can never redraw twice. */
        var now = Date.now();
        if (now - _lastRedraw > 250) {
          _lastRedraw = now;
          if (window.Shivaa && typeof window.Shivaa.redraw === 'function') window.Shivaa.redraw();
          else if (typeof window.route === 'function') window.route();
        }
      } else {
        window.location.hash = target;
      }
      return true;
    } catch (e) { return false; }
  }

  /* ── 1 · THE BAG DRAWER OWNS ITS OWN TAPS ─────────────────────────── */
  function closeBag() {
    try {
      if (window.Shivaa && typeof window.Shivaa.closeCart === 'function') { window.Shivaa.closeCart(); return; }
    } catch (e) {}
    try {
      var d = document.getElementById('cartDrawer'); if (d) d.classList.remove('open');
      var s = document.getElementById('cartScrim'); if (s) s.classList.remove('open');
    } catch (e) {}
  }

  function onBagTap(e) {
    var bag = document.getElementById('cartDrawer');
    if (!bag) return;
    var t = e.target;
    var a = (t && t.closest) ? t.closest('a[href^="#/"]') : null;
    if (!a || !bag.contains(a)) return;          /* "Continue shopping" and ✕ keep the old path */
    /* defaultPrevented is NOT a bail-out — see the identical note in js/v127.js */
    if (!plainTap(e)) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#/') !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    haptic(10);
    navigate(href);        /* FIRST — the app performs the navigation itself */
    closeBag();            /* THEN — and only then does the bag slide away */
  }

  /* ── 2 · THE DRAWER'S 17-CATEGORY LIST COLLAPSES WHEN YOU LEAVE ──────
     Owner report: *"whenever you click on any category then 17 categories is
     load and then when you click on any category … still that 17 photos are on
     the page"*. js/v116.js builds `#dwCatList` once and toggles `.open` on it;
     nothing ever collapsed it, so the expanded wall of 17 photographs was
     still open the next time the menu was opened. Collapsing on navigation
     (and on the menu closing) leaves the drawer tidy without removing a single
     category — the 17 stay, they just start folded. */
  function foldCatList() {
    try {
      var l = document.getElementById('dwCatList'); if (!l) return;
      l.classList.remove('open');
      var b = document.getElementById('navCats');
      if (b) { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }
    } catch (e) {}
  }

  /* ── bind ─────────────────────────────────────────────────────────── */
  function bind() {
    var bag = document.getElementById('cartDrawer');
    if (bag && !bag.__shvV139) {
      bag.__shvV139 = true;
      /* capture phase: this runs before app.js's bubble-phase dismiss, so the
         dismiss-first path can never fire ahead of the navigation. */
      bag.addEventListener('click', onBagTap, true);
    }
    /* the bag is created lazily by initMiniCart(); retry until it exists */
    if (!bag) setTimeout(bind, 400);
  }

  try {
    window.addEventListener('hashchange', foldCatList);
  } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
  try { window.addEventListener('load', bind, { once: true }); } catch (e) {}
  try { setTimeout(bind, 1200); } catch (e) {}

})();
