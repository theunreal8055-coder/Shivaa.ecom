/* v239 — "the sidebar row cannot collapse, whatever the cascade says".
 *
 * v238 pinned the drawer rows to width:100%. The owner applied it and the
 * Swarna Nidhi row still printed its label one character per line, so the row
 * was never the thing losing its width — the label column inside it is. This
 * file stops fighting the cascade and removes the failure mode instead:
 *
 *   1 · every drawer ROW becomes a two/three track CSS GRID
 *       (`auto minmax(0,1fr) auto`) with inline styles, so the label track is
 *       the full remaining width on every engine, no matter which of the 70
 *       layers in the bundle last touched display / flex / width;
 *   2 · the label itself can never break per character again:
 *         <b>     one line, ellipsis
 *         <small> two lines at a word boundary, then ellipsis
 *       — "S / w / a / r / n / a" is not reachable in either.
 *
 *   Both are applied INLINE (style attribute), which outranks every layer,
 *   including layers added in later releases.
 *
 *   3 · `?navdiag=1` — if it is still wrong after this, the owner opens
 *       https://shivaa.in/?navdiag=1 , opens the drawer, and screenshots the
 *       panel this file draws: every row's measured width/height plus the
 *       computed display of the row and the computed flex/width of the label.
 *       That screenshot names the culprit exactly.
 *
 * Progressive: without this file the drawer behaves exactly as it does today.
 */
(function () {
  'use strict';
  if (window.__shvNavFix) return;          // exactly one owner
  window.__shvNavFix = true;

  var DIAG = false;
  try { DIAG = /(?:\?|&)navdiag=1\b/.test(location.search); } catch (_) {}

  function drawer() { return document.getElementById('mainNav'); }
  /* ── v243 · THE DRAWER FIX MAY NEVER TOUCH THE DESKTOP BAR ─────────────
     `#mainNav` is two different things depending on the screen:
       · ≤820 px  → the side drawer (a column of rows, this file's target);
       · >820 px  → the horizontal category bar inside the header, where each
         row is an equal flex link.
     v239 wrote `width:100% !important` inline onto every row with NO viewport
     check, and inline styles outrank all 71 cascade layers — so on a laptop
     the header bar got nine links each demanding the full bar width and the
     categories visibly vanished ("PC main header se jo categories thi vo sab
     ud chuki hain"). Every rule in this file is now drawer-only. */
  function drawerMode() {
    try { return !window.matchMedia || window.matchMedia('(max-width: 820px)').matches; }
    catch (e) { return true; }
  }
  function isRow(el) {
    return el && el.tagName === 'A' &&
      (el.classList.contains('dw-row') || el.classList.contains('nav-jwl'));
  }

  /* ── 1 · the rows ─────────────────────────────────────────────────────── */
  function fixRow(a) {
    if (!isRow(a)) return;
    if (!drawerMode()) return;               // v243 — the header bar is not a drawer
    if (a.__shvRowFixed) return;
    var tx = a.querySelector('.dw-tx');
    if (!tx) return;

    a.style.setProperty('display', 'grid', 'important');
    a.style.setProperty('grid-template-columns', 'auto minmax(0,1fr) auto', 'important');
    a.style.setProperty('align-items', 'center', 'important');
    a.style.setProperty('width', '100%', 'important');
    a.style.setProperty('max-width', '100%', 'important');
    a.style.setProperty('box-sizing', 'border-box', 'important');

    tx.style.setProperty('min-width', '0', 'important');
    tx.style.setProperty('width', 'auto', 'important');
    tx.style.setProperty('max-width', '100%', 'important');

    var b = tx.querySelector('b');
    if (b) {
      b.style.setProperty('display', 'block', 'important');
      b.style.setProperty('white-space', 'nowrap', 'important');
      b.style.setProperty('overflow', 'hidden', 'important');
      b.style.setProperty('text-overflow', 'ellipsis', 'important');
      b.style.setProperty('max-width', '100%', 'important');
    }
    var small = tx.querySelector('small');
    if (small) {
      small.style.setProperty('display', '-webkit-box', 'important');
      small.style.setProperty('-webkit-box-orient', 'vertical', 'important');
      small.style.setProperty('-webkit-line-clamp', '2', 'important');
      small.style.setProperty('overflow', 'hidden', 'important');
      small.style.setProperty('word-break', 'normal', 'important');
      small.style.setProperty('overflow-wrap', 'normal', 'important');
      small.style.setProperty('max-width', '100%', 'important');
    }
    a.__shvRowFixed = true;
  }

  function fixAll() {
    var nav = drawer();
    if (!nav) return;
    var rows = nav.querySelectorAll('.nav-scroll > a');
    for (var i = 0; i < rows.length; i++) fixRow(rows[i]);
  }

  /* ── 2 · when ─────────────────────────────────────────────────────────── */
  fixAll();                                        // markup is static: do it once now
  document.addEventListener('DOMContentLoaded', fixAll);
  window.addEventListener('load', fixAll);
  window.addEventListener('resize', fixAll, { passive: true });

  var nav = drawer();
  if (nav && window.MutationObserver) {
    new MutationObserver(function () {
      fixAll();
      if (nav.classList.contains('open')) requestAnimationFrame(report);
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#navToggle,.nav-toggle')) setTimeout(function () { fixAll(); report(); }, 120);
  }, true);

  /* ── 3 · the diagnostic the owner can screenshot ──────────────────────── */
  function lines() {
    var nav = drawer();
    if (!nav) return ['no #mainNav'];
    var panelW = Math.round(nav.clientWidth);
    var out = ['panel ' + panelW + 'px  viewport ' + window.innerWidth + 'px'];
    var rows = nav.querySelectorAll('.nav-scroll > *');
    for (var i = 0; i < rows.length; i++) {
      var el = rows[i], r = el.getBoundingClientRect();
      var cls = (el.className || '').toString().split(' ')[0] || el.tagName;
      var tx = el.querySelector ? el.querySelector('.dw-tx') : null;
      var cs = window.getComputedStyle(el);
      var line = (i + 1) + ' ' + cls.slice(0, 12) + '  row ' + Math.round(r.width) + 'x' + Math.round(r.height) + '  d:' + cs.display;
      if (tx) {
        var tcs = window.getComputedStyle(tx);
        var bb = tx.querySelector('b'), scs = bb ? window.getComputedStyle(bb) : null;
        line += '  tx ' + Math.round(tx.getBoundingClientRect().width) + ' w:' + tcs.width + ' f:' + tcs.flexGrow + '/' + tcs.flexShrink + '/' + tcs.flexBasis;
        if (scs) line += '  b.ws:' + scs.whiteSpace;
      }
      out.push(line.replace(/\s+/g, ' '));
    }
    return out;
  }

  function report() {
    if (!DIAG) return;
    var nav = drawer();
    if (nav && !nav.classList.contains('open')) return;
    var box = document.getElementById('shvNavDiag');
    if (!box) {
      box = document.createElement('pre');
      box.id = 'shvNavDiag';
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;padding:8px 10px;' +
        'max-height:46vh;overflow:auto;background:#000;color:#8f8;font:10px/1.45 ui-monospace,monospace;' +
        'white-space:pre-wrap;word-break:break-word;border-top:2px solid #8f8';
      document.body.appendChild(box);
    }
    box.textContent = 'SHIVAA NAV DIAG v239\n' + lines().join('\n');
  }

  if (DIAG) {
    document.addEventListener('click', function () { setTimeout(report, 350); }, true);
  }
})();
