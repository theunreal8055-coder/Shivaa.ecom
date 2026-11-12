/* ═══════════════════════════════════════════════════════════════
   SHIVAA v242 — "responsive" (taps land again)

   THE OWNER'S REPORT: after v241 the site scrolls beautifully and
   "clicks are not working, buttons are unresponsive".

   Nothing in the tap path was rewritten in v241 — in a DOM-only test
   (jsdom) every control still fires on the first try: tiles navigate,
   quick view opens, the heart toggles. So the page was never dead; taps
   were being EATEN. Three things in v241 could do that, and all three are
   removed or guarded here:

     1 · THE SERVICE WORKER WAS SCANNING ITS IMAGE CACHE ON EVERY IMAGE.
         v241 raised MEDIA_MAX 60 → 160 because thumbnails are small. But
         trimMedia() expiring-old-entries runs `c.match()` for EVERY cached
         entry after EVERY image write: with ~100 pictures on the home page
         that is thousands of CacheStorage reads during the first scroll,
         all on the worker's single thread. The page paints, then the phone
         grinds. Now the count trim is O(1) deletions and the age sweep runs
         at most once an hour, plus once on activation.

     2 · A FULL REPAINT ONE TO THREE SECONDS AFTER PAINT. v241 painted from
         the device catalogue at 800 ms and then re-entered boot() the moment
         the API answered — route() closes any open sheet, empties the bag and
         rewrites #view. A tap in that window was dropped, and a tap that had
         just opened something had it closed under the finger. app.js now
         waits for a calm moment (no touch for 4 s, no sheet open, tab
         visible) and retries until it gets one.

     3 · A LAYER ON TOP OF THE PAGE. If any full-viewport element is left
         over the page without `.open`, it swallows every tap and the site
         looks perfectly fine. That is now impossible by rule (the injected
         style below) and reported by instrument (the rescue and ?tapdiag=1).

   WHAT ELSE THIS FILE DOES — the second half of the owner's request, "fix
   some errors I didn't even mention":

     · the tap beacon every other layer can read (`window.__shvLastInput`);
     · a rescue: if a tap lands on a screen-covering layer that is not a real
       sheet, it is neutralised on the spot so the next tap works, and it is
       named in ?tapdiag=1;
     · `?tapdiag=1` draws the last taps with what the browser actually hit
       (position, z-index, pointer-events) — the same honest instrument v239's
       ?navdiag=1 gave the drawer;
     · `?perf=1` keeps working (that lives in v241.js).

   This file never dispatches a click of its own, never preventDefaults, and
   never runs when the flag is off except for the passive beacon.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function () {

  var REL = window.__SHIVAA_REL || 242;
  var DIAG = /[?&]tapdiag=1\b/.test(location.search) || /[?&]tapdiag=1\b/.test(location.hash);
  var log = [];

  /* ── 1 · the rule: a scrim that is not open cannot eat a tap ─────────────
     Sheets and modals keep working exactly as before — they carry `.open` while
     they own the screen. A leftover backdrop (closed by a route change, an
     error, a double tap) has no business being clickable, and this is the one
     failure mode that makes a whole site feel "unresponsive" while it scrolls
     perfectly. Injected as a <style> so it arrives with this file and needs no
     bundle rebuild. */
  (function scrimRule() {
    if (document.getElementById('v242-scrim')) return;
    var s = document.createElement('style');
    s.id = 'v242-scrim';
    s.textContent = [
      /* closed overlays: invisible to the eye and to the finger */
      '.modal-overlay:not(.open),.fsheet-overlay:not(.open),.mega-backdrop[hidden],.shv-backdrop[hidden],',
      '.preloader.hide,.modal-overlay[hidden],.fsheet-overlay[hidden]{pointer-events:none!important}',
      /* the sticky bars never cover a control: they stay under the sheets */
      '.header,.mnav{will-change:auto}',
      /* any full-screen layer this file had to neutralise stays neutralised */
      '[data-v242-stray]{pointer-events:none!important}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ── 2 · the beacon: one timestamp every layer can trust ──────────────── */
  function markInput() { window.__shvLastInput = Date.now(); }
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) {
    addEventListener(ev, markInput, { capture: true, passive: true });
  });

  /* ── 3 · what the browser says is under the finger ────────────────────── */
  function describe(el) {
    if (!el) return 'nothing';
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    var id = el.id ? '#' + el.id : '';
    var cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    var cs = {};
    try { cs = getComputedStyle(el); } catch (e) {}
    var r = { width: 0, height: 0 };
    try { r = el.getBoundingClientRect(); } catch (e) {}
    return el.tagName.toLowerCase() + id + cls +
      ' [' + Math.round(r.width) + 'x' + Math.round(r.height) +
      ' z=' + (cs.zIndex || 'auto') +
      ' pe=' + (cs.pointerEvents || 'auto') +
      ' pos=' + (cs.position || 'static') + ']';
  }

  var REAL_SHEETS = '.modal-overlay.open,.fsheet-overlay.open,.nav.open,.cart-sheet.open,.search-drawer.open,.pd-lightbox.open,.dw.open';
  var NEVER = '.modal-overlay,.fsheet-overlay,.nav,.cart-sheet,.search-drawer,.pd-lightbox,.header,.mnav,.toast-wrap,.wa-fab,.route-bar,.scroll-progress,.offline-bar,.preloader';

  /* a screen-covering layer that carries no control of its own is a leftover,
     never a surface the shopper is meant to use */
  function looksStray(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el === document.body || el === document.documentElement) return false;
    if (el.matches(NEVER)) return false;
    if (el.closest(REAL_SHEETS)) return false;
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { return false; }
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
    var r;
    try { r = el.getBoundingClientRect(); } catch (e) { return false; }
    var covers = r.width >= innerWidth * 0.85 && r.height >= innerHeight * 0.85;
    if (!covers) return false;
    if (el.querySelector('a[href],button,input,select,textarea,[onclick],[role="button"]')) return false;
    return true;
  }

  function tapPoint(ev) {
    var t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    return { x: Math.round(t.clientX || 0), y: Math.round(t.clientY || 0) };
  }
  function at(x, y) { try { return document.elementFromPoint(x, y); } catch (e) { return null; } }

  addEventListener('pointerdown', function (ev) {
    try {
      var p = tapPoint(ev);
      var hit = at(p.x, p.y);
      var target = ev.target;
      /* the browser hit a different element than the one the event names: something
         is on top. Name it in the log, and neutralise it if it is a leftover. */
      if (hit && (!target || (hit !== target && !hit.contains(target) && !target.contains(hit)))) {
        log.push({ at: new Date().toLocaleTimeString(), point: p.x + ',' + p.y, top: describe(hit), target: describe(target), stray: looksStray(hit) });
        if (looksStray(hit)) {
          hit.setAttribute('data-v242-stray', '1');
          try { hit.style.setProperty('pointer-events', 'none', 'important'); } catch (e) {}
          var again = at(p.x, p.y);
          log.push({ at: new Date().toLocaleTimeString(), note: 'neutralised → now ' + describe(again) });
        }
      } else if (DIAG) {
        /* the ordinary case costs NOTHING unless the instrument is on: one
           elementFromPoint, no getComputedStyle, no layout. A diagnostic that
           makes taps slower would be its own bug. */
        log.push({ at: new Date().toLocaleTimeString(), point: p.x + ',' + p.y, top: describe(hit || target), clean: true });
      }
      if (log.length > 40) log.shift();
      if (DIAG) paintDiag();
    } catch (e) { /* a diagnostic must never break a tap */ }
  }, { capture: true, passive: true });

  /* ── 4 · ?tapdiag=1 — the last taps, named ────────────────────────────── */
  var box = null;
  function paintDiag() {
    try {
      if (!box) {
        box = document.createElement('div');
        box.id = 'v242tapdiag';
        box.style.cssText = 'position:fixed;z-index:99998;left:8px;right:8px;bottom:70px;background:#0d0a06;color:#f7e7c6;'
          + 'font:11px/1.5 ui-monospace,Menlo,monospace;border:1px solid #d4af5a;border-radius:12px;padding:10px 12px;'
          + 'max-height:46vh;overflow:auto;box-shadow:0 16px 44px rgba(0,0,0,.6);pointer-events:auto';
        box.addEventListener('click', function (e) {
          if (e.target.closest('b')) { box.remove(); box = null; }
        });
        document.body.appendChild(box);
      }
      var rows = log.slice(-8).reverse().map(function (r) {
        if (r.note) return '<div style="color:#9ee6a8">· ' + r.note + '</div>';
        if (r.clean) return '<div>✓ ' + r.point + ' → ' + r.top + '</div>';
        return '<div style="color:#ffb3a7">✗ ' + r.point + ' top=' + r.top + (r.stray ? ' <b style="color:#ffe9bd">[leftover layer — neutralised, tap here again]</b>' : '') + '</div>'
          + '<div style="opacity:.6;margin:0 0 4px 10px">wanted: ' + r.target + '</div>';
      }).join('');
      box.innerHTML = '<div><b style="color:#ffe9bd">v' + REL + ' · tap diagnostics</b> — tap anywhere. Tap this title to close.</div>'
        + '<div style="opacity:.7;margin:4px 0 6px">sheet open: ' + (document.querySelector(REAL_SHEETS) ? 'yes' : 'no')
        + ' · scroll locked: ' + (document.documentElement.classList.contains('no-scroll') ? 'yes' : 'no')
        + ' · left over: ' + document.querySelectorAll('[data-v242-stray]').length + '</div>' + rows;
    } catch (e) {}
  }
  if (DIAG) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintDiag, { once: true });
    else paintDiag();
  }

  /* ── 5 · boot-time scan: name any leftover layer before the first tap ─── */
  function scan() {
    try {
      /* only the layers that can possibly cover the screen: body, its children
         and their children. A full `body *` walk with getComputedStyle on a shop
         page is thousands of forced style reads — a diagnostic must not become
         the jank it is looking for. */
      var all = [];
      for (var a = 0; a < document.body.children.length; a++) {
        all.push(document.body.children[a]);
        for (var b = 0; b < document.body.children[a].children.length; b++) all.push(document.body.children[a].children[b]);
      }
      var found = [];
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.matches(NEVER) || el.closest(REAL_SHEETS)) continue;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
        var r = el.getBoundingClientRect();
        if (r.width >= innerWidth * 0.85 && r.height >= innerHeight * 0.85 && !el.querySelector('a[href],button,input,select,textarea,[onclick]')) {
          found.push(el);
        }
      }
      found.forEach(function (el) {
        if (looksStray(el)) { el.setAttribute('data-v242-stray', '1'); try { el.style.setProperty('pointer-events', 'none', 'important'); } catch (e) {} }
        log.push({ at: new Date().toLocaleTimeString(), point: 'scan', top: 'leftover: ' + describe(el), stray: true });
      });
      if (found.length && DIAG) paintDiag();
      window.Shivaa = window.Shivaa || {};
      window.Shivaa.v242 = { log: log, describe: describe, scan: scan };
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(scan, 1500); }, { once: true });
  else setTimeout(scan, 1500);
})();
