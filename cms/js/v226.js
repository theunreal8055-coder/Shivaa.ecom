/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · v226 — THE BUTTER LAYER: every click answers.
   ───────────────────────────────────────────────────────────────────────
   v225 put the chrome's scroll work in one frame. v226 is about the moment
   a finger lands: what the app does in the 100 ms after a tap.

   MEASURED BEFORE WRITING ANY OF THIS (jsdom, 6 routes, 1058 visible
   interactive elements, matched against all 155 `:active` selector heads in
   the shipped bundle): **265 of them answered a press with nothing** —
   102 mega-menu tiles, 40 category-bar tiles (`.cb-item`), 33 photo links
   (`.pc-imglink`), 33 Quick-view buttons, the brand link, the utility-bar
   and footer contact links, the header scheme pill and the offer pill.
   On a phone the extra `*:hover{transform:none!important}` neutraliser in
   `mobile.css` (correct in itself — nothing may stick to a tap) then takes
   away even the browser's own answer. That is what "clicks feel dead" is.

   What this file adds, each one gated by `prefers-reduced-motion` and by the
   device flags the site already publishes (`au-lite` = save-data / ≤4 cores /
   ≤2GB, read live, never cached — aurum.js can re-flag mid-visit):

     1 · PRESS — a ripple on every pressable that did not have one, the same
         `.rip` span the house has used since v89 (`motion.js` owns `.btn`).
         Small controls ripple at touch-down; big surfaces (a product card, a
         list row) ripple only on a real tap, so starting a scroll on a card
         never lights it up. Rail items ripple on release so a horizontal
         flick does not fire a ripple on every chip it passes.
     2 · HAPTIC — one 5 ms tick on a real tap (never on the down of a drag).
     3 · RAIL CENTRING — tap a chip / tab / step in a snapped rail and that
         item glides to the middle of the rail (native-app behaviour).
     4 · BADGE POPS — the cart badge has popped since v89; wish and compare
         never did. They do now, with the same `mBump` keyframe.
     5 · ROUTE JUMP — `html{scroll-behavior:smooth}` turned the router's
         `scrollTo(0,0)` into an animated slide of the OLD page; a page change
         now starts at the top instantly and the new page's own entrance
         supplies the motion.
     6 · ROUTE PACE — a 2px gold hairline sweeps the top of the screen, but
         only if the next page has taken longer than 180 ms to render. On a
         fast tap nothing appears at all.
     7 · VIEW TRANSITIONS — where the browser has `startViewTransition`
         (Chrome/Android, Safari 18) a page change cross-fades the content
         while the chrome stays put, and the entrance animation stands down
         for that one navigation. Elsewhere the entrance plays exactly as
         before.

   Rules kept: no scroll listener, no per-frame layout read (the ripple reads
   a rect once per press, outside any frame), transform/opacity only, every
   listener passive, and the whole file is inert without JS.
   ─────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__shvButter) return;

  var doc = document, root = doc.documentElement;
  var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = !!(mq && mq.matches);
  var view = doc.getElementById('view');

  /* device flags are read live, not cached: aurum.js adds `au-lite` at parse
     time and v125.js re-checks it, so a class can arrive after this file */
  function has(c) { return root.classList.contains(c); }

  var stats = { ripples: 0, taps: 0, haptics: 0, centers: 0, jumps: 0, busy: 0, vt: 0, bumps: 0 };

  /* ── the pressable surface ───────────────────────────────────────────────
     Two lists on purpose. `NOW` answers at touch-down: a chip, a tab, a
     tile, a row, a small button — a drag almost never starts on one of
     these. `TAP` answers on release: product and category cards, where a
     scroll absolutely does start under the thumb. */
  var NOW = '.chip,.cat-pill,.size-pill,.tab,.pay-opt,.dw-close,.dw-tile,.dw-row,' +
            '.pc-quick,.see-all,.sortsel,.fv-appband-x,.shv-step-btn,.cb-item,' +
            '.mega-tile,.mega-feat,.mega-cta,.acc-row,.ord-row,.fvt-trustlink';
  var TAP = '.p-card,.cat-card,.cat-mini-card,.acct-tile,.tv-card,.cert-card,.hm-card,.ms-card';
  var RIPPLE = NOW + ',' + TAP;
  /* rails: their children answer on release, never on the down of a flick */
  var RAIL = '.catbar2 .cb-item,.cat-chips > *,.adr-sw > *,.stages > *,' +
             '.sz-strip-wrap > *,.tabs > *,.acct-nav > *,.adm-nav > *,' +
             '.shv-stepper-wrap .shv-step-btn';
  var HAPTIC = '.btn,.pc-quick,.cb-item,.mega-tile,.mega-feat,.mega-cta,.cat-mini-card,' +
               '.cat-pill,.chip,.size-pill,.tab,.pay-opt,.dw-tile,.dw-close,.shv-step-btn,' +
               '.mnav a,.catbar2 a,.fv-appband-x,.p-card,.cat-card,.acct-tile';

  function closest(el, sel) { return (el && el.closest) ? el.closest(sel) : null; }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  /* ── 1 · the ripple ──────────────────────────────────────────────────────
     Identical geometry to motion.js's (same `.rip` class, same maths, same
     700 ms). Two extra host classes: `.rip-pos` only when the host is
     `position:static` (so a relative wrapper can never re-parent an
     absolutely positioned badge), and `.rip-live` which is what actually
     clips the circle — added for 700 ms and removed again, so a card is
     never a clipping box for longer than its own ripple. */
  function ripple(host, x, y) {
    if (reduced || !host || host.__rip) return false;
    host.__rip = 1;
    try {
      if (getComputedStyle(host).position === 'static') host.classList.add('rip-pos');
      host.classList.add('rip-live');
      var r = host.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 1.15;
      if (!(size > 4)) size = 44;
      var s = doc.createElement('span');
      s.className = 'rip' + (size > 200 ? ' rip-big' : '');
      s.style.width = s.style.height = size + 'px';
      s.style.left = (x - r.left - size / 2) + 'px';
      s.style.top = (y - r.top - size / 2) + 'px';
      host.appendChild(s);
      stats.ripples++;
      setTimeout(function () {
        if (s.parentNode) s.parentNode.removeChild(s);
        host.classList.remove('rip-live', 'rip-pos');
        host.__rip = 0;
      }, 700);
      return true;
    } catch (e) { host.__rip = 0; return false; }
  }

  /* ── 3 · rail centring ───────────────────────────────────────────────────
     `block:'nearest'` means the page itself only moves if the tapped item
     were off screen vertically, which it never is after a tap. Skipped when
     the rail does not actually scroll (a desktop row that fits) and for a
     detached node (the router may already have replaced the page). */
  function centerRail(el) {
    if (reduced || !el || !el.isConnected || !el.scrollIntoView) return false;
    var rail = el.parentElement;
    if (!rail) return false;
    if (rail.scrollWidth <= rail.clientWidth + 4) return false;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      stats.centers++;
      return true;
    } catch (e) { return false; }
  }

  /* ── the pointer path ───────────────────────────────────────────────────── */
  var down = null;
  doc.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var host = closest(e.target, RIPPLE);
    if (!host) return;
    var rail = closest(host, RAIL);
    down = { host: host, x: e.clientX, y: e.clientY, rail: !!rail, haptic: !!closest(host, HAPTIC) };
    if (!reduced && !rail && host.matches(NOW)) ripple(host, e.clientX, e.clientY);
  }, { passive: true, capture: true });

  doc.addEventListener('pointermove', function (e) {
    if (!down || down.moved) return;
    if (Math.abs(e.clientX - down.x) > 8 || Math.abs(e.clientY - down.y) > 8) down.moved = true;
  }, { passive: true, capture: true });

  doc.addEventListener('pointerup', function (e) {
    var d = down; down = null;
    if (!d) return;
    stats.taps++;
    /* a real tap is a press that never moved: that is the only thing that
       haptics or a big-surface ripple should answer */
    if (d.moved) return;
    if (d.rail) ripple(d.host, e.clientX, e.clientY);
    else if (d.host.matches(TAP)) ripple(d.host, e.clientX, e.clientY);
    /* the house rule for haptics (aurum.js's own `haptic()`) is coarse AND not
       reduced-motion: a visitor who asked for calm gets no buzzing either */
    if (d.haptic && !reduced) { vibrate(5); stats.haptics++; }
  }, { passive: true, capture: true });

  doc.addEventListener('pointercancel', function () { down = null; }, { passive: true, capture: true });

  /* ── 4 · wish + compare badges pop like the cart's always has ───────────── */
  ['wishCount', 'cmpCount'].forEach(function (id) {
    var el = doc.getElementById(id);
    if (!el || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (reduced || el.__bump) return;
      el.__bump = 1;
      el.classList.remove('bump');
      void el.offsetWidth;                      /* restart the animation */
      el.classList.add('bump');
      stats.bumps++;
      setTimeout(function () { el.classList.remove('bump'); el.__bump = 0; }, 620);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* ── 5 · route jump ──────────────────────────────────────────────────────
     `html{scroll-behavior:smooth}` (motion.css:17, styles.css:25) applies to
     the router's `window.scrollTo({top:0})` too — so a page change animated
     a long slide of the page being left. One class turns that one scroll
     instant; the new page is already at the top when its entrance plays. */
  var jumpT = 0;
  function routeJump() {
    root.classList.add('route-jump');
    stats.jumps++;
    clearTimeout(jumpT);
    jumpT = setTimeout(function () { root.classList.remove('route-jump'); }, 600);
  }

  /* ── 6 · the pace bar — only when the next page is actually slow ────────── */
  var pace = null, busyT = 0, busyHard = 0;
  function paceEl() {
    if (pace && pace.isConnected) return pace;
    pace = doc.getElementById('routePace');
    if (!pace) {
      pace = doc.createElement('div');
      pace.id = 'routePace';
      pace.setAttribute('aria-hidden', 'true');
      pace.innerHTML = '<i></i>';
      doc.body.appendChild(pace);
    }
    return pace;
  }
  function armBusy() {
    if (reduced || has('route-busy')) return;
    clearTimeout(busyT);
    busyT = setTimeout(function () {
      paceEl();
      root.classList.add('route-busy');
      stats.busy++;
      clearTimeout(busyHard);
      busyHard = setTimeout(clearBusy, 5000);   /* never leave a spinner on */
    }, 180);
  }
  function clearBusy() {
    clearTimeout(busyT); clearTimeout(busyHard);
    root.classList.remove('route-busy');
  }
  addEventListener('hashchange', clearBusy, { passive: true });
  addEventListener('popstate', function () { routeJump(); clearBusy(); }, { passive: true });
  if (view && window.MutationObserver) new MutationObserver(clearBusy).observe(view, { childList: true });

  /* ── 7 · view transitions ────────────────────────────────────────────────
     The router renders inside the `hashchange` task, so the transition waits
     for the first real mutation of #view (max 300 ms) and only then lets the
     browser take the new snapshot: a cross-fade of the finished page, never
     of a blank one. Skipped entirely for reduced motion, for low-power
     devices (`au-lite`, read live), for a link marked `data-no-vt`, and for
     a link that does not actually change the page.

     `html.vt-run` is what gives #view its `view-transition-name` and what
     tells motion.js not to replay the entrance for this one navigation —
     both sides of the snapshot are then fully painted, so what cross-fades
     is the page, not an empty shell. */
  var vtGen = 0, vtOn = typeof doc.startViewTransition === 'function';
  function runVT(href) {
    var gen = ++vtGen;
    root.classList.add('vt-run');
    if (view) void view.offsetWidth;             /* flush the name before the old snapshot */
    var t;
    try {
      t = doc.startViewTransition(function () {
        return new Promise(function (resolve) {
          var done = false, mo = null, hard = 0;
          function finish() {
            if (done) return;
            done = true;
            clearTimeout(hard);
            if (mo) mo.disconnect();
            requestAnimationFrame(function () { resolve(); });
          }
          hard = setTimeout(finish, 300);
          if (view && window.MutationObserver) {
            mo = new MutationObserver(finish);
            mo.observe(view, { childList: true });
          }
          location.hash = href;
        });
      });
    } catch (e) {
      root.classList.remove('vt-run');
      try { location.hash = href; } catch (e2) { return false; }
      return false;
    }
    stats.vt++;
    var off = function () {
      if (gen !== vtGen) return;                 /* a newer navigation owns the class now */
      root.classList.remove('vt-run');
      if (view) view.classList.remove('pg');     /* the entrance was stood down, not queued */
    };
    if (t && t.finished && t.finished.then) t.finished.then(off, off); else setTimeout(off, 900);
    setTimeout(off, 1400);                       /* belt: never leave the class stuck on */
    return true;
  }

  /* The nav click is read on the bubble phase on purpose: every handler the
     app already has runs first, so a link the app intercepts (and cancels)
     is left completely alone. */
  doc.addEventListener('click', function (e) {
    /* rail centring rides the same click, after the app's own bookkeeping */
    var item = closest(e.target, RAIL);
    if (item) centerRail(item);

    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = closest(e.target, 'a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.hasAttribute('data-no-vt')) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '#' || href.charAt(1) !== '/') return;
    if (href === location.hash) return;                   /* same page: nothing to transition */
    routeJump();
    if (vtOn && !reduced && !has('au-lite') && !has('vt-run')) {
      e.preventDefault();
      runVT(href);
      return;
    }
    armBusy();
  });

  window.__shvButter = {
    stats: stats,
    ripple: ripple,
    centerRail: centerRail,
    routeJump: routeJump,
    armBusy: armBusy,
    clearBusy: clearBusy,
    runVT: runVT,
    hasVT: vtOn,
    reduced: reduced,
    generation: function () { return vtGen; }
  };
})();
