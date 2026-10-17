/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · v227 — WHAT THE PAGE STILL OWED THE SHOPPER.
   ───────────────────────────────────────────────────────────────────────
   Small, finished, and each piece proof-testable on its own:

     1 · THE HERO CUE — the home hero's "discover" hint was a whisper: 44%
         white inside 60% opacity, measured. It is a readable control now, and
         the legacy hero variant (a bare <div> that ate taps and answered
         nothing) is a labelled button that goes to the section below it.
     2 · THE LATE LAZY PASS — app.js sweeps images at 0/900/2600 ms. CMS rows
         mounted after that (news logos, banner art, a freshly switched
         category) stayed eager and un-decoded. Same rule, later: nothing in
         the viewport is deferred, everything below it is.
     3 · THE RAIL'S ACTIVE CHIP — v226 centres a chip after a tap. On arrival
         the active chip was wherever it happened to fall in the row. It is
         centred on settle with `scrollLeft` arithmetic, so the page itself
         never moves (no `scrollIntoView`, no `block:` option, no jump).
     4 · ONE RUPEE SIGN IN THE RATE LINE — `fmt()` has printed its own `₹`
         since v120; the v208 ribbon carried a second one, so the live strip
         read "₹₹6,998/g" on the home page. Fixed at the source in app.js and
         guarded here, because this line is fed by the rates API and a CMS and
         re-rendered every 30 seconds.
     5 · THE BOTTOM NAV'S REAL HEIGHT — the footer bleed was a hard-coded
         60px against a 64px nav. The measured height is published as
         `--shv-mnav-h` for css/v227.css to bleed and clear by.

   Ownership: this file adds no fourth scroll driver (v225 owns progress,
   #backTop and the show/hide classes; aurum.js owns hero parallax), no
   observer on the film cards (v223's wake() contract is untouched), and no
   press surface of its own (v226 owns ripples, motion.js owns `.btn`).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var win = window, doc = document;
  var reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function isReduced() { return !!(reduced && reduced.matches); }
  var stats = { cues: 0, cueGone: 0, swept: 0, centred: 0, tickerFixes: 0, navH: 0 };

  /* ── 1 · the cue ────────────────────────────────────────────────────── */
  var cueOff = null;
  function cueWire() {
    var cue = doc.querySelector('.hero-cue[data-hero-cue]');
    if (!cue || cue.__v227) return false;
    cue.__v227 = 1;
    /* the hint is only honest when there is somewhere to go */
    var hero = cue.closest('.hero') || cue.parentElement;
    var next = hero && hero.nextElementSibling;
    if (!next || next.tagName === 'SCRIPT' || next.tagName === 'STYLE') {
      cue.hidden = true;
      return false;
    }
    cue.hidden = false;
    cue.addEventListener('click', function () {
      var top = win.scrollY + next.getBoundingClientRect().top;
      /* the router starts every page at 0 with the page's own entrance, so
         this is the only place a hero is intentionally scrolled past */
      try { win.scrollTo({ top: Math.max(0, top - 8), behavior: isReduced() ? 'auto' : 'smooth' }); }
      catch (e) { win.scrollTo(0, top); }
      stats.cues++;
      cue.classList.add('is-gone');
    });
    /* one passive listener, removed the moment it has done its job */
    cueOff = function () {
      if (!cue.isConnected || win.scrollY < 60) return;
      cue.classList.add('is-gone');
      stats.cueGone++;
      win.removeEventListener('scroll', cueOff);
      cueOff = null;
    };
    win.addEventListener('scroll', cueOff, { passive: true });
    return true;
  }

  /* ── 2 · the late lazy pass ─────────────────────────────────────────── */
  function lazyLate() {
    var imgs = doc.querySelectorAll('img:not([loading])');
    if (!imgs.length) return 0;
    var n = 0, floor = win.innerHeight + 40;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.dataset && img.dataset.shvLazy) continue;
      if (img.getBoundingClientRect().top > floor) {
        img.loading = 'lazy';
        img.decoding = 'async';
        try { img.dataset.shvLazy = '1'; } catch (e) {}
        n++;
      }
    }
    stats.swept += n;
    return n;
  }

  /* ── 3 · the rail's active chip ─────────────────────────────────────── */
  function railActive() {
    var rails = doc.querySelectorAll('.catbar2, .shv-rail');
    var done = 0;
    for (var i = 0; i < rails.length; i++) {
      var rail = rails[i];
      if (!rail.scrollWidth || rail.scrollWidth <= rail.clientWidth + 4) continue;
      var chip = rail.querySelector('[aria-current="true"],.on,.active,[data-on="1"]');
      if (!chip) continue;
      if (!chip.getAttribute('aria-current')) chip.setAttribute('aria-current', 'true');
      /* middle band: 12% in from each edge. Inside it the row is already
         telling the truth and moving it would be motion for its own sake. */
      var left = chip.offsetLeft, w = chip.offsetWidth, vw = rail.clientWidth;
      var target = Math.max(0, left - (vw - w) / 2);
      var safeLo = rail.scrollLeft + vw * 0.12, safeHi = rail.scrollLeft + vw * 0.88;
      if (left >= safeLo && left + w <= safeHi) continue;
      if (Math.abs(target - rail.scrollLeft) < 6) continue;
      try {
        if (rail.scrollTo) rail.scrollTo({ left: target, behavior: isReduced() ? 'auto' : 'smooth' });
        else rail.scrollLeft = target;
        done++;
      } catch (e) { rail.scrollLeft = target; }
      rail.dataset.shvCentred = '1';
    }
    stats.centred += done;
    return done;
  }

  /* ── 4 · one rupee sign ─────────────────────────────────────────────── */
  function tickerFix() {
    var host = doc.getElementById('rateStrip');
    if (!host) return 0;
    /* a cheap gate, not a one-shot flag: the rates poll rewrites this
       element every 30 seconds, so "I have already run once" would let a
       doubled sign come back on the next tick. */
    if (!/₹[\s\u00a0]*₹/.test(host.textContent || '')) return 0;
    var n = 0, walker = doc.createTreeWalker(host, 4 /* SHOW_TEXT */, null, false), node;
    var list = [];
    while ((node = walker.nextNode())) list.push(node);
    for (var i = 0; i < list.length; i++) {
      var v = list[i].nodeValue;
      if (v && /₹\s*₹/.test(v)) {
        /* rupee, optional thin/nbsp spacing, rupee → one rupee. Only the
           duplication is touched; a genuine price is never re-formatted. */
        list[i].nodeValue = v.replace(/₹[\s\u00a0]*₹/g, '₹');
        n++;
      }
    }
    stats.tickerFixes += n;
    return n;
  }

  /* ── 5 · the bottom nav's real height ───────────────────────────────── */
  function mnavMeasure() {
    var nav = doc.querySelector('.mnav');
    var h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    /* a hidden nav reports 0: keep the published fallback rather than
       collapsing the footer's clearance to nothing */
    if (h >= 40 && h <= 160) {
      doc.documentElement.style.setProperty('--shv-mnav-h', h + 'px');
      stats.navH = h;
      return h;
    }
    return stats.navH;
  }

  /* the strip is re-rendered by the rates poll, so the guard watches the one
     element that carries it — childList only, no subtree, no attributes, and
     nothing at all if the strip is not on this page */
  function watchStrip() {
    var host = doc.getElementById('rateStrip');
    if (!host || host.__v227w || !win.MutationObserver) return;
    host.__v227w = 1;
    try {
      new MutationObserver(function () { tickerFix(); }).observe(host, { childList: true });
    } catch (e) {}
  }

  /* ── settle ─────────────────────────────────────────────────────────── */
  var timers = [];
  function settle() {
    cueWire();
    lazyLate();
    tickerFix();
    watchStrip();
    railActive();
    mnavMeasure();
  }
  function schedule() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [setTimeout(settle, 260), setTimeout(settle, 1400), setTimeout(settle, 3200)];
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
  win.addEventListener('hashchange', schedule, { passive: true });
  win.addEventListener('load', schedule, { once: true });
  var rz;
  win.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { mnavMeasure(); railActive(); }, 250);
  }, { passive: true });
  win.addEventListener('orientationchange', function () { setTimeout(function () { mnavMeasure(); railActive(); }, 400); }, { passive: true });

  /* QA surface: the suites call these instead of waiting on timers */
  win.Shivaa227 = {
    settle: settle,
    sweep: lazyLate,
    centerRail: railActive,
    tickerFix: tickerFix,
    mnavMeasure: mnavMeasure,
    stats: stats
  };
})();
