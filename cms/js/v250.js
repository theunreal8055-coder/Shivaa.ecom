/* ═══════════════════════════════════════════════════════════════════════════
   v250 · “STILL” — the scripted half of the phone's paint budget, and the page
   that will not move.

   Three jobs, none of them cosmetic:

     1 · NAME THE DEVICE. `html.shv-mobile` is set from `matchMedia` in
         index.html before the first frame (so nothing flashes in or out), and
         this file re-asserts it after boot in case the page was restored from
         the back/forward cache with a different viewport. css/v250.css hangs
         every compositor budget rule off that class. It is a class and not a
         `@media (pointer: coarse)` block for a practical reason: a media query
         cannot be tested here, and an untestable rule is how four releases in a
         row shipped decoration that nobody could measure.

     2 · GIVE A FROZEN PAGE BACK. `lockScroll()` counter + `html.no-scroll` is
         how every sheet locks the page behind it. One missed release and the shop
         cannot be scrolled and looks dead — “the page doesn't move anywhere
         sometimes”. This watches for that exact shape: the lock is on, nothing
         that could own it is open, and the shopper is trying to move the page.
         After 700 ms of that, the page is handed back (app.js
         forceUnlockScroll). It never fires while a sheet is open, and it never
         fires unprompted — only when a gesture says “I am trying to scroll”.

     3 · MEASURE IT. `Shivaa.v250.audit()` counts what the phone is actually
         compositing at this moment: backdrop-filter passes, blending groups,
         running animations, the infinite ones, layer promotions. The numbers in
         css/v250.css's header came from exactly this measurement; the next
         report can be a number instead of an adjective.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvStill) return;
  window.__shvStill = true;

  var doc = document, root = doc.documentElement;
  var NOFX = /[?&]nofx=1/.test(location.search);

  /* ── 1 · name the device ──────────────────────────────────────────────── */
  function isMobile() {
    try {
      if (matchMedia('(pointer: coarse)').matches) return true;
      if (matchMedia('(max-width: 820px)').matches) return true;
    } catch (e) {}
    return (window.innerWidth || 1024) <= 820;
  }
  function nameDevice() {
    var m = isMobile();
    root.classList.toggle('shv-mobile', m);
    root.setAttribute('data-shv-device', m ? 'phone' : 'desktop');
  }
  nameDevice();
  addEventListener('resize', nameDevice, { passive: true });
  addEventListener('pageshow', nameDevice, { passive: true });

  /* ── 2 · the page that will not move ──────────────────────────────────── */
  /* everything that could legitimately own the lock */
  /* v250 — “open” is not the same as “in the document”. The first version of this
     list included `.mega-panel`, which lives in index.html permanently and is
     only revealed by a class; the watchdog therefore believed a sheet was always
     open and never handed a frozen page back. Every candidate must now (a) match
     an OPEN marker and (b) be actually visible. */
  var OWNERS = [
    '#modalOverlay.open', '.modal.open', '[role="dialog"].open',
    '#searchDrawer.open', '#searchScrim.open', '#searchScrim.on',
    '#drawerScrim.open', '#drawerScrim.on', 'body.drawer-open', 'body.nav-open',
    '.mega-panel.open', '.mega-panel.on', '.mega-panel[data-open="1"]',
    '.fsheet-overlay.open', '.wa-modal.on', '.nb-modal.on',
    '[class$="-sheet"].open', '[class$="-sheet"].on', '.sheet.open',
    '#miniCart.open', '.cart-drawer.open'
  ].join(', ');

  function visible(el) {
    try {
      var s = getComputedStyle(el);
      if (!s) return false;
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (s.opacity === '0') return false;
      var r = el.getBoundingClientRect();
      if (r && (r.width === 0 || r.height === 0) && s.position !== 'fixed') return false;
      return true;
    } catch (e) { return true; }
  }

  function overlaysOpen() {
    var hits;
    try { hits = doc.querySelectorAll(OWNERS); } catch (e) { return true; }
    for (var i = 0; i < hits.length; i++) if (visible(hits[i])) return true;
    return false;
  }

  var frozenNoted = [];
  function checkFrozen() {
    if (!root.classList.contains('no-scroll')) return false;
    if (overlaysOpen()) return false;
    if (window.Shivaa && typeof window.Shivaa.forceUnlockScroll === 'function') {
      window.Shivaa.forceUnlockScroll();
    } else {
      root.classList.remove('no-scroll');
      root.style.overflow = '';
    }
    frozenNoted.push(Math.round((window.performance && performance.now) ? performance.now() : Date.now()));
    if (frozenNoted.length > 10) frozenNoted.shift();
    return true;
  }

  /* only while the shopper is trying to move the page — never on a timer alone */
  var pending = 0;
  function watch() {
    clearTimeout(pending);
    pending = setTimeout(checkFrozen, 700);
  }
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
    addEventListener(ev, watch, { passive: true, capture: true });
  });
  /* a route change is the moment a stale lock is most likely to be inherited */
  addEventListener('hashchange', function () { setTimeout(checkFrozen, 60); }, { passive: true });

  /* ── 3 · QUIET THE PAGE ─────────────────────────────────────────────────
     The CSS budget in css/v250.css is written by selector, and a selector list
     is always one release behind the markup: the probe after writing it still
     found 90 animating elements on the phone home, because `bcOrbitA` lives on a
     bare `<i>` inside a component whose class nobody predicted. So the last word
     is not CSS at all — it is a walk over what is actually on screen:

       · any element whose computed `animation-iteration-count` is infinite gets
         `animation-name: none`, except the two marquees (pure transform, text
         the shopper reads);
       · any element holding a `will-change` layer promise is released.

     One pass per page, 800 ms after it is on screen (so the entrance motion the
     shopper is meant to see has finished, and the pass cannot fight it), and
     never on a desktop. A phone is then STILL: nothing repaints unless the
     shopper does something, which is what “smooth and lightning fast” means on a
     device with no headroom to spare. */
  var quieted = 0, quietTimer = 0;
  var KEEP = /(^|\s)(rs-ticker-track|rev-track)(\s|$)/;
  function quietThePage() {
    if (!isMobile() || NOFX) return 0;
    var scope = doc.getElementById('view');
    if (!scope) return 0;
    var nodes = scope.querySelectorAll('*');
    var changed = 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], st;
      try { st = getComputedStyle(n); } catch (e) { continue; }
      if (!st) continue;
      if (st.willChange && st.willChange !== 'auto') { n.style.willChange = 'auto'; changed++; }
      var it = st.animationIterationCount || '';
      if (it.indexOf('infinite') >= 0 && n.animationName !== 'none') {
        if (!KEEP.test(String(n.className || ''))) { n.style.animationName = 'none'; changed++; }
      } else if (n.animationName !== 'none') {
        /* a child of something that moves forever: its own animation is invisible
           work. Seventy star pops inside the review marquee was the worst case. */
        var host = n.parentElement;
        var depth = 0;
        while (host && depth++ < 6) {
          if (/(^|\s)(rev-track|rs-ticker-track|rev-marquee|ticker-wrap|band-track)(\s|$)/.test(String(host.className || ''))) {
            n.style.animationName = 'none'; changed++; break;
          }
          host = host.parentElement;
        }
      }
    }
    quieted += changed;
    return changed;
  }
  function scheduleQuiet() {
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () {
      /* requestAnimationFrame first: never measure styles in the same task that
         painted them */
      var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      raf(function () { quietThePage(); });
    }, 800);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', scheduleQuiet, { once: true });
  else scheduleQuiet();
  addEventListener('hashchange', scheduleQuiet, { passive: true });

  /* ── 4 · measure what the phone is compositing ────────────────────────── */
  function audit() {
    var scope = doc.getElementById('view') || doc.body;
    var nodes = scope.querySelectorAll('*');
    var out = {
      device: isMobile() ? 'phone' : 'desktop',
      elements: nodes.length,
      blurPasses: 0,      /* backdrop-filter — a render surface each */
      blends: 0,          /* mix-blend-mode — an isolated group each */
      filterBlur: 0,      /* filter: blur() — a full-surface blur */
      running: 0,         /* animations actually running */
      infinite: 0,        /* the ones that never stop */
      promoted: 0,        /* will-change promises */
      fixed: 0,
      fpsHint: null,
      frozen: frozenNoted.slice(),
      release: window.__SHIVAA_REL || 0
    };
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], s;
      try { s = getComputedStyle(n); } catch (e) { continue; }
      if (!s) continue;
      var bf = s.backdropFilter || s.webkitBackdropFilter || '';
      if (bf && bf !== 'none') out.blurPasses++;
      if (s.mixBlendMode && s.mixBlendMode !== 'normal') out.blends++;
      if ((s.filter || '').indexOf('blur') >= 0) out.filterBlur++;
      if (s.animationName && s.animationName !== 'none') {
        out.running++;
        if ((s.animationIterationCount || '').indexOf('infinite') >= 0) out.infinite++;
      }
      if (s.willChange && s.willChange !== 'auto') out.promoted++;
      if (s.position === 'fixed') out.fixed++;
    }
    return out;
  }

  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v250 = {
    get mobile() { return root.classList.contains('shv-mobile'); },
    get nofx() { return NOFX; },
    audit: audit,
    checkFrozen: checkFrozen,
    quiet: quietThePage,
    /** one line, the same shape as the v248/v249 reports */
    report: function () {
      var a = audit();
      return 'still ' + a.release + ' · ' + a.device +
        ' · ' + a.elements + ' els' +
        ' · blur ' + a.blurPasses + ' · blend ' + a.blends + ' · filterBlur ' + a.filterBlur +
        ' · animating ' + a.running + ' (infinite ' + a.infinite + ')' +
        ' · promoted ' + a.promoted +
        ' · quieted ' + quieted +
        ' · frozen-page rescues ' + a.frozen.length +
        (a.frozen.length ? ' [' + a.frozen.join(' ') + ']' : '');
    }
  };
})();
