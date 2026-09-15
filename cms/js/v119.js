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

  /* ── 2 · INSTALL CHIP (second visit only) ───────────────────────────────
     The manifest, icons and shortcuts already exist; the browser only offers
     `beforeinstallprompt` when the app is installable, and we show the chip
     from the SECOND visit onwards — a first-time visitor is never nagged.
     Closing it is remembered forever (per device). */
  var VISITS = 'shv_visits', CLOSED = 'shv_install_closed';
  var priorVisits = 0;
  try {
    priorVisits = parseInt(localStorage.getItem(VISITS) || '0', 10) || 0;
    localStorage.setItem(VISITS, String(priorVisits + 1));
  } catch (e) {}

  function alreadyInstalled() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {}
    return !!(window.navigator && window.navigator.standalone);
  }
  function chipClosed() {
    try { return localStorage.getItem(CLOSED) === '1'; } catch (e) { return false; }
  }
  function hideChip() {
    var c = doc.getElementById('shvInstallChip');
    if (c && c.parentNode) c.parentNode.removeChild(c);
  }
  var promptEvent = null;
  function showChip() {
    if (!promptEvent || alreadyInstalled() || chipClosed() || priorVisits < 1) return;
    if (doc.getElementById('shvInstallChip')) return;
    var chip = doc.createElement('div');
    chip.id = 'shvInstallChip';
    chip.setAttribute('role', 'dialog');
    chip.setAttribute('aria-label', 'Install the Shivaa app');
    chip.innerHTML =
      '<div><div class="shv-ic-title">Keep Shivaa on your home screen</div>' +
      '<div class="shv-ic-sub">Live Jaipur rates, one tap away — works offline too.</div></div>' +
      '<button type="button" class="shv-ic-go">Install</button>' +
      '<button type="button" class="shv-ic-x" aria-label="Not now">&#10005;</button>';
    doc.body.appendChild(chip);
    var go = chip.querySelector('.shv-ic-go'), x = chip.querySelector('.shv-ic-x');
    if (go) go.onclick = function () {
      hideChip();
      var p = promptEvent; promptEvent = null;
      try { if (p && p.prompt) p.prompt(); } catch (e) {}
    };
    if (x) x.onclick = function () {
      hideChip();
      try { localStorage.setItem(CLOSED, '1'); } catch (e) {}
    };
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptEvent = e;
    showChip();
  });
  window.addEventListener('appinstalled', function () {
    hideChip(); promptEvent = null;
    try { localStorage.setItem(CLOSED, '1'); } catch (e) {}
  });

  /* ── 3 · boot ─────────────────────────────────────────────────────────── */
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watchSkeleton);
  else watchSkeleton();
})();
