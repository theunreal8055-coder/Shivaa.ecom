/* v238 — "the drawer never collapses a row".
 *
 * The owner's screenshot (12 Nov 2026, Android Chrome): in the open side drawer
 * the 4th Explore row — Swarna Nidhi / "11 + 1 monthly gold plan" — rendered its
 * label ONE CHARACTER PER LINE ("S / w / a / r / n / a / N / i / d / h / i"), so
 * the row became ~150 px wide and ~550 px tall, every row under it was pushed
 * off screen, and the drawer looked like it had "expanded like crazy".
 *
 * The label column can only collapse that far if the row itself lost its width:
 * `.dw-tx{flex:1;min-width:0}` lets the text shrink to nothing when the row is
 * narrower than the drawer. This site loads one bundle of 70 CSS layers, and any
 * late layer that resets a width / an alignment on `.nav-scroll` can do exactly
 * that to one row — the markup of the broken row is identical to the three rows
 * above it, so the cause is cascade, not HTML.
 *
 * Two-part guard, both closed to this file (no CSS layer, no bundle rebuild):
 *   1. a scoped <style>, mobile only, that pins the drawer to a column of
 *      full-width rows and refuses to break a label mid-word;
 *   2. a measurement, once per drawer open: any direct row measured under 70 %
 *      of the drawer's width gets an inline width, which outranks every layer.
 *
 * Progressive: without this file the drawer behaves exactly as it does today.
 */
(function () {
  'use strict';
  if (window.__shvNavGuard) return;      // exactly one owner
  window.__shvNavGuard = true;

  var CSS = [
    '@media (max-width:860px){',
    '.nav.open .nav-scroll{display:flex!important;flex-direction:column!important;align-items:stretch!important}',
    '.nav.open .nav-scroll>*{align-self:stretch!important;flex:0 0 auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box}',
    '.nav.open .nav-scroll .dw-tx{flex:1 1 auto!important;min-width:0!important;width:auto!important}',
    '.nav.open .nav-scroll .dw-tx b,.nav.open .nav-scroll .dw-tx small{white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important}',
    '.nav.open .nav-scroll .dw-ic,.nav.open .nav-scroll .dw-gi,.nav.open .nav-scroll .dw-ar{flex:0 0 auto!important}',
    '.nav.open .nav-scroll .dw-tiles>*{width:auto!important}',
    '}'
  ].join('');

  try {
    var st = document.createElement('style');
    st.id = 'v238-nav-guard';
    st.appendChild(document.createTextNode(CSS));
    (document.head || document.documentElement).appendChild(st);
  } catch (_) {}

  function drawer() { return document.getElementById('mainNav'); }

  /* One measurement per open. A row that lost its width keeps its text column;
     the inline width outranks every cascade layer, including future ones. */
  function heal() {
    var nav = drawer();
    if (!nav || !nav.classList.contains('open')) return;
    var w = nav.clientWidth;
    if (!w) return;
    var rows = nav.querySelectorAll('.nav-scroll > a, .nav-scroll > button, .nav-scroll > .shv-offer-side');
    for (var i = 0; i < rows.length; i++) {
      var el = rows[i];
      if (el.getBoundingClientRect().width < w * 0.7) el.style.width = '100%';
    }
  }

  var nav = drawer();
  if (nav && window.MutationObserver) {
    new MutationObserver(function () {
      if (nav.classList.contains('open')) requestAnimationFrame(heal);
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#navToggle,.nav-toggle')) setTimeout(heal, 60);
  }, true);

  window.addEventListener('resize', heal, { passive: true });
})();
