/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v119 — install chip (2nd visit) + first-paint safety net.
   Additive and self-guarding: if any piece is unavailable the rest still runs,
   and nothing here can block or re-route the storefront.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';
(function () {
  var doc = document;

  /* ── 1 · SKELETON LIFECYCLE ──────────────────────────────────────────────
     app.js replaces #view wholesale on the first route render, which removes
     the skeleton. We mirror that into `body.shv-ready` so CSS can settle, and
     we keep a safety net: if a phone is still looking at the skeleton after
     9 s (slow network, stalled boot), it gets an honest "still loading" note
     with a retry — never an endless blank. */
  function skeletonGone() {
    var sk = doc.querySelector('#view .shv-skeleton');
    if (!sk) { doc.body.classList.add('shv-ready'); return true; }
    return false;
  }
  function watchSkeleton() {
    if (skeletonGone()) return;
    var view = doc.getElementById('view');
    if (view && typeof MutationObserver === 'function') {
      var mo = new MutationObserver(function () { if (skeletonGone()) { try { mo.disconnect(); } catch (e) {} } });
      try { mo.observe(view, { childList: true, subtree: true }); } catch (e) {}
    }
    setTimeout(function () {
      if (skeletonGone()) return;
      var sk = doc.querySelector('#view .shv-skeleton');
      if (!sk || doc.querySelector('#shvSlowNote')) return;
      var note = doc.createElement('div');
      note.id = 'shvSlowNote';
      note.className = 'shv-slow';
      note.innerHTML = 'Still loading the live rates and your pieces…<br><button type="button" id="shvRetry">Tap to retry</button>';
      sk.insertAdjacentElement('afterend', note);
      var btn = doc.getElementById('shvRetry');
      if (btn) btn.onclick = function () { location.reload(); };
    }, 9000);
  }

  /* ── 2 · INSTALL CHIP — REMOVED in v140 (18 Sep 2026) ──────────────────
     The owner's report, verbatim: a small pop-up says "keep shivaa on your
     home screen", and tapping its cross first shifts it aside, then back to
     centre, and it never actually goes — it disturbed the shopping experience.
     The chip and everything that could summon it are DELETED (the design
     decision: never re-ask). The app remains installable through the
     browser's own menu; the site just no longer nags or positions a bar of
     its own. `shv_visits` is no longer needed and is not written. */

  /* ── 3 · boot ─────────────────────────────────────────────────────────── */
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watchSkeleton);
  else watchSkeleton();
})();
