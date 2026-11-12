/* v237 — "the page stays where your thumb left it".
 *
 * The owner's report: "jab bhi kisi option pe click karta hun toh vo expand ho
 * jata hai" — every question you tap opens an answer under the page, the page
 * grows, and the line you were reading walks away from your thumb. Tapping a
 * second question grew it by two answers at once.
 *
 * Every panel in this site is a native <details class="acc">, so this file only
 * listens; nothing is rebuilt and no markup is required.
 *   1. one answer per group — opening one closes the others, so the section can
 *      never grow by more than a single answer;
 *   2. the summary you tapped is kept below the sticky header and on screen, so
 *      the click never scrolls your place away.
 *
 * Progressive: if this file fails to load, the native accordion still opens and
 * closes exactly as before. Nothing here is load-bearing for the page.
 */
(function () {
  'use strict';
  if (window.__shvAcc) return;            // exactly one owner
  window.__shvAcc = true;

  var REDUCED = false;
  try { REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) {}

  function headerHeight() {
    var h = document.getElementById('header');
    if (!h) return 0;
    var r = h.getBoundingClientRect();
    return r.height > 0 ? r.height : 0;
  }

  /* After an answer opens, the tapped summary must still be visible: the page
     grows below it, never above it. If the sticky header has covered it, move
     the window by exactly the overlap — one write, no animation loop. */
  function keepTappedVisible(summary) {
    if (!summary || !summary.isConnected) return;
    var floor = headerHeight() + 8;
    var top = summary.getBoundingClientRect().top;
    if (top >= floor) return;
    window.scrollBy(0, top - floor);
  }

  function closeSiblings(d) {
    var parent = d.parentElement;
    if (!parent) return;
    var kids = parent.children, closed = 0;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n === d || n.tagName !== 'DETAILS' || !n.open) continue;
      if (!n.classList || !n.classList.contains('acc')) continue;
      n.open = false;
      closed++;
    }
    return closed;
  }

  /* `toggle` does not bubble, so listen in the capture phase. */
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    if (!d.classList || !d.classList.contains('acc')) return;

    closeSiblings(d);

    var summary = d.querySelector('summary');
    if (!summary) return;
    if (REDUCED) { keepTappedVisible(summary); return; }
    requestAnimationFrame(function () { keepTappedVisible(summary); });
  }, true);
})();
