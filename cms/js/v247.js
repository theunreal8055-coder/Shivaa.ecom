/* ═══════════════════════════════════════════════════════════════════════════
   v247 · “ATELIER” — the behaviour half of the feel layer.

   css/v247.css does the visual work. This file adds the three things CSS cannot
   know on its own:

     1 · PICTURES FADE IN INSTEAD OF POPPING. A photograph that appears between
         two frames is the difference between “a website” and “a shop”. Only
         images that are still loading get the fade — an image that arrived
         before this script looked at it is left alone, because fading an
         already-visible picture reads as a blink, which is worse.
     2 · A ROUTE CHANGE RISES. #view is observed for new blocks; the first six
         get a 240 ms rise (css §9). The class is removed afterwards so a later
         price patch can never re-trigger it.
     3 · AN HONEST AUDIT. window.Shivaa.v247.audit() returns what the owner can
         actually report on: how many elements still hold a compositor layer,
         how many prices are still waiting for a rate, how many pictures are
         still loading, and whether motion is on. No guessing, no adjectives.

   It obeys the same two rules as every layer since v245: it never hides or
   defers real content, and it never reads layout while the page is scrolling.
   With JS off, or with ?nofx=1, the site is complete — it simply does not
   animate.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shvAtelier) return;
  window.__shvAtelier = true;

  var doc = document;
  var NOFX = /[?&]nofx=1/.test(location.search);
  var REDUCED = false;
  try { REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var MOTION = !NOFX && !REDUCED;

  /* ─── 1 · pictures ease in ────────────────────────────────────────────── */
  var tracked = new WeakMap();     /* img → timeout id, so the failsafe is cleared */

  function settle(img) {
    var t = tracked.get(img);
    if (t) { clearTimeout(t); tracked.delete(img); }
    img.classList.add('shv-img-in');
  }

  function watch(img) {
    if (!img || img.tagName !== 'IMG' || img.dataset.sxv) return;
    /* an image that is already here is already right: no fade, no blink */
    if (img.complete && img.naturalWidth > 0) { img.dataset.sxv = '1'; return; }
    img.dataset.sxv = '1';
    if (!MOTION) return;
    var done = function () { settle(img); };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    /* failsafe: a picture must never be left invisible by this layer, so the
       fade is applied unconditionally after four seconds whatever happened */
    tracked.set(img, setTimeout(done, 4000));
  }

  function sweep(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll('#view img, .header img, .footer img');
    for (var i = 0; i < list.length; i++) watch(list[i]);
  }

  /* ─── 1b · the hero headline lets go of its layers ─────────────────────
     Each word of the hero headline is a span with `will-change: transform,
     opacity` for a 0.78 s reveal — and then it keeps that layer for the rest of
     the session. The reveal is over at ~1.7 s (stagger included), so the inline
     style is cleared there; inline wins over the stylesheet rule, and the words
     are already at their final state. */
  function releaseHeroLayers() {
    var words = doc.querySelectorAll('.au-w');
    for (var i = 0; i < words.length; i++) words[i].style.willChange = 'auto';
  }
  if (MOTION) setTimeout(releaseHeroLayers, 1900);

  /* ─── 2 · a route change rises ────────────────────────────────────────── */
  var riseTimer = 0;
  function rise(view) {
    if (!MOTION || !view || !view.children.length) return;
    view.classList.add('shv-rise');
    clearTimeout(riseTimer);
    /* 360 ms is longer than the 240 ms animation: if the class is still there
       when it ends, nothing is animating anyway — and if it is removed early,
       a block in mid-flight would snap. */
    riseTimer = setTimeout(function () { view.classList.remove('shv-rise'); }, 360);
  }

  /* ─── boot ────────────────────────────────────────────────────────────── */
  function start() {
    var view = doc.getElementById('view');
    sweep(doc);

    if (view && 'MutationObserver' in window) {
      /* direct children only, no subtree: a price patch inside a card must never
         be read as a page change */
      var mo = new MutationObserver(function (records) {
        var added = false;
        for (var i = 0; i < records.length; i++) {
          if (records[i].addedNodes && records[i].addedNodes.length) { added = true; break; }
        }
        if (!added) return;
        if (MOTION) rise(view);
        sweep(view);                      /* new pictures in the new page */
      });
      try { mo.observe(view, { childList: true }); } catch (e) {}
    }

    /* the shop also streams pictures into place after its own async renders */
    doc.addEventListener('shv:rendered', function () { sweep(doc); });
    addEventListener('hashchange', function () { sweep(doc); }, { passive: true });
    if (MOTION) {
      var t = 0;
      addEventListener('scroll', function () {
        if (t) return;
        t = setTimeout(function () { t = 0; if (!doc.hidden) sweep(doc); }, 400);
      }, { passive: true });
    }

    doc.documentElement.setAttribute('data-sxv', MOTION ? 'motion' : 'still');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  /* ─── 3 · the audit the owner can send ───────────────────────────────── */
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v247 = {
    get motion() { return MOTION; },
    audit: function () {
      var view = doc.getElementById('view') || doc.body;
      var layered = 0, pendingImg = 0, moving = 0;
      var all = view.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i], cs;
        try { cs = getComputedStyle(el); } catch (e) { continue; }
        if (cs.willChange && cs.willChange !== 'auto') layered++;
        if (cs.transform && cs.transform !== 'none') moving++;
      }
      var imgs = view.querySelectorAll('img');
      for (i = 0; i < imgs.length; i++) if (!imgs[i].complete || !imgs[i].naturalWidth) pendingImg++;
      var sk = view.querySelectorAll('.pr-sk').length;
      return {
        motion: MOTION,
        reducedMotion: REDUCED,
        nofx: NOFX,
        elements: all.length,
        compositedLayers: layered,
        transformed: moving,
        pictures: imgs.length,
        picturesLoading: pendingImg,
        pricesWaiting: sk,
        riseActive: view.classList.contains('shv-rise'),
        release: window.__SHIVAA_REL || 0
      };
    }
  };
})();
