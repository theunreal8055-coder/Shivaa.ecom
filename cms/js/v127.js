/* ══════════════════════════════════════════════════════════════════════
   SHIVAA v127 — NAVIGATION OWNERSHIP for two tap targets.
   Owner report (17 Sep 2026): "in the search bar whenever you click on any
   category it directly shifts us to the homepage rather than that category"
   and "in the sidebar, Live Rates / Swarna Nidhi / Gold Buyback — the buttons
   are there, they look perfect, but they are not functional; every button
   takes us to the home page".

   Nothing here changes a design, a colour, a route, a price or a rate. It
   only decides HOW those taps travel. Two mechanisms, one for each report:

   1 · SEARCH PALETTE CATEGORY CHIPS (the reported "goes to the home page")
     app.js dismissed the palette *inside* the click and then let the anchor's
     own default action do the navigating:
         const cat = e.target.closest('a.sugg-cat');
         if (cat) { closeSearch(); return; }   // "native anchor navigates"
     js/v120.js watches overlay classes and, when a sheet closes while the
     hash is unchanged, calls history.back() to release the history entry the
     open had pushed. So the tap did two things at once: it queued a history
     traversal AND (a beat later, as the click's default action) pushed the
     new hash. In a real browser the traversal wins — the shopper is dropped
     on the entry that was current before the palette opened, i.e. the home
     page. Reproduced: an instrumented run of the shipped tree records
     history.back() firing on exactly this tap.
     Fix: navigate FIRST, dismiss SECOND, and arm the house flag
     window.__shvNavigating that js/v120.js already honours, so no traversal
     can be queued against a navigation in flight.

   2 · SIDEBAR (drawer) ROWS
     Live Rates · Gold Buyback · Swarna Nidhi · Bespoke & Care · Design
     Selection · Gold Finale · For Jewellers · the four photo tiles · the
     17-category list · the three footer links were all relying on the
     browser's native anchor action, with the drawer sliding shut 90 ms later.
     The app itself never performed the navigation, so anything that could
     swallow or out-race that default action left the tap dead — and a dead
     tap on the home page reads exactly as "it took me to the home page".
     Fix: this layer owns the tap. It reads the href, prevents the default,
     sets the hash itself (or redraws when the hash is already the target, so
     a repeat tap still does something), and only then closes the drawer.

   Additive and self-guarding: every block checks for its element and API. If
   this file never loads, the site behaves exactly as it did before — no other
   file's behaviour is edited, and no route, price, rate or version stamp is
   touched.
   ══════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  /* ── the house navigation flag ────────────────────────────────────────
     js/v120.js already refuses to call history.back() while this is set.
     Setting it is the difference between "the sheet closed" and "the sheet
     closed because we are navigating somewhere". */
  function arm(ms) {
    try {
      window.__shvNavigating = true;
      if (window.__shvNavArm) clearTimeout(window.__shvNavArm);
      window.__shvNavArm = setTimeout(function () {
        window.__shvNavigating = false;
      }, ms || 500);
    } catch (e) {}
  }

  /* a plain same-tab tap. Ctrl/⌘/shift/alt-click and middle-click must keep
     their native "open in a new tab" behaviour. */
  function plainTap(e) {
    if (!e) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    return e.button === undefined || e.button === 0;
  }

  function haptic(ms) {
    try { if (window.Shivaa && window.Shivaa.haptic) window.Shivaa.haptic(ms || 10); } catch (e) {}
  }

  /* ── the one door every tap in this file walks through ─────────────── */
  var _lastRedraw = 0;
  function navigate(hash) {
    var target = String(hash || '');
    if (target.indexOf('#/') !== 0) return false;
    arm();
    try {
      if (window.location.hash === target) {
        /* A browser fires no hashchange for the URL it is already on, so a
           second tap on the row you are standing on would do nothing at all.
           js/v118.js already replays the route for category links from the
           document capture phase, so this is debounced — one redraw per tap,
           never two. */
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

  /* ── 1 · the sidebar / drawer ─────────────────────────────────────── */
  function closeDrawer(nav) {
    if (typeof window._closeDrawer === 'function') {
      try { window._closeDrawer(); return; } catch (e) {}
    }
    try { nav.classList.remove('open'); } catch (e) {}
    try {
      var t = document.getElementById('navToggle');
      if (t) t.classList.remove('open');
      document.body.classList.remove('drawer-open');
    } catch (e) {}
  }

  function onDrawerTap(e) {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    var t = e.target;
    var a = (t && t.closest) ? t.closest('a[href^="#/"]') : null;
    if (!a || !nav.contains(a)) return;
    /* e.defaultPrevented is deliberately NOT a bail-out here: js/v118.js
       preventDefaults a same-hash category tap in the document capture phase
       as part of doing this same job. Bailing on it would hand the tap back
       to the old dismiss-first path and leave the drawer stuck open. */
    if (!plainTap(e)) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#/') !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    haptic(10);
    navigate(href);       /* the app performs the navigation itself */
    closeDrawer(nav);     /* …and only then slides the drawer away */
  }

  /* ── 2 · the search palette's category chips ──────────────────────── */
  function closePalette(box) {
    try {
      var d = document.getElementById('searchDrawer');
      if (d) d.classList.remove('open');
      if (box) box.classList.remove('open');
    } catch (e) {}
  }

  function onPaletteTap(e) {
    var box = document.getElementById('searchSugg');
    if (!box) return;
    var t = e.target;
    var a = (t && t.closest) ? t.closest('a.sugg-cat') : null;
    if (!a || !box.contains(a)) return;
    if (!plainTap(e)) return;   /* see the drawer note above */
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#/') !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    haptic(8);
    navigate(href);       /* FIRST */
    closePalette(box);    /* THEN — never the other way round */
  }

  /* ── bind (capture phase: this runs before app.js's own bubble-phase
     handlers, so the old dismiss-first path can never fire) ─────────── */
  function bind() {
    var nav = document.getElementById('mainNav');
    var box = document.getElementById('searchSugg');
    if (nav && !nav.__shvV127) {
      nav.__shvV127 = true;
      nav.addEventListener('click', onDrawerTap, true);
    }
    if (box && !box.__shvV127) {
      box.__shvV127 = true;
      box.addEventListener('click', onPaletteTap, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
  /* belt and braces — a late shell rebuild must not leave a tap dead */
  try { window.addEventListener('load', bind, { once: true }); } catch (e) {}
  try { setTimeout(bind, 1200); } catch (e) {}

})();
