/* v240 — THE RIPPLE BUG. Root cause found in the code, not guessed.
 *
 * v226's ripple transport appends a span into the host it is pressed on:
 *     <span class="rip" style="width:412px;height:412px;left:..;top:..">
 * v226's own header says "`.rip` itself (size, position, `mRipple` keyframes) is
 * motion.css's". It is not — motion.css scopes every one of those properties to
 * `.btn .rip` (`position:absolute; border-radius:50%; transform:scale(0);
 * animation:mRipple …`). A `.btn` therefore ripples correctly, and EVERY OTHER
 * host gets a 412 px square sitting in normal flow.
 *
 * In the side drawer that host is a row (`.dw-row`, `display:flex`). The 412 px
 * span becomes a flex item, the label column (`.dw-tx{flex:1;min-width:0}`) is
 * squeezed to a few pixels, every word breaks one character per line, the row
 * grows to ~550 px and the rest of the menu is pushed off screen — the owner's
 * "sidebar expands and blank space comes", on every tap, in the sidebar only.
 *
 * The fix is the rule that was always believed to exist, applied where it
 * cannot fight the button ripple (`.btn .rip` keeps its own transform/animation
 * untouched — this file never overrides those):
 *
 *     .rip-live > .rip { position:absolute; border-radius:50%; pointer-events:none }
 *
 * Plus: any ripple span already stranded in a drawer row from before this file
 * loaded is removed, and v239's inline grid/nowrap experiments are reverted so
 * the drawer keeps its designed flex layout.
 */
(function () {
  'use strict';
  if (window.__shvRipFix) return;          // exactly one owner
  window.__shvRipFix = true;

  var CSS = [
    /* the missing rule — absolute positioning only; transform and animation
       stay exactly as `.btn .rip` defines them, so buttons are untouched. */
    '.rip-live > .rip{position:absolute !important;border-radius:50%;pointer-events:none;box-sizing:border-box}',
    '.rip-pos{position:relative !important}',
    /* belt: inside the drawer a ripple is never in flow, whatever its host
       class state is at the moment it is created. */
    '.nav .nav-scroll .rip{position:absolute !important;border-radius:50%;pointer-events:none}',
    /* a ripple can never be part of a row's layout again */
    '.nav .nav-scroll > a{position:relative}'
  ].join('\n');

  try {
    var st = document.createElement('style');
    st.id = 'v240-rip-position';
    st.appendChild(document.createTextNode(CSS));
    (document.head || document.documentElement).appendChild(st);
  } catch (_) {}

  /* ── undo v239's experiment (it was built on the wrong diagnosis) ─────── */
  /* v243 — the same viewport split v239 needed: below 820 px this is the side
     drawer and the row styles belong there; above it this is the header's
     horizontal category bar, and ANY inline width on a row (999 px of
     `width:100% !important`) drags the categories out of the bar. On a desktop
     every trace of the drawer work is removed, including the ones an older
     cached script already planted in this DOM. */
  var ROW_PROPS = ['display', 'grid-template-columns', 'align-items', 'width', 'max-width', 'box-sizing', 'min-width'];
  var TX_PROPS = ['min-width', 'width', 'max-width', 'display'];
  var B_PROPS = ['display', 'white-space', 'overflow', 'text-overflow', 'max-width'];
  var SM_PROPS = ['display', '-webkit-box-orient', '-webkit-line-clamp', 'overflow', 'word-break', 'overflow-wrap', 'max-width'];
  function strip(el, props) { if (!el || !el.style) return; for (var i = 0; i < props.length; i++) el.style.removeProperty(props[i]); }
  function isDrawer() {
    try { return !window.matchMedia || window.matchMedia('(max-width: 820px)').matches; }
    catch (e) { return true; }
  }
  function restoreBar() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    var nodes = nav.querySelectorAll('.nav-scroll > a, .nav-scroll > button, .nav-jwl');
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      strip(a, ROW_PROPS);
      var tx = a.querySelector('.dw-tx');
      if (tx) {
        strip(tx, TX_PROPS);
        strip(tx.querySelector('b'), B_PROPS);
        strip(tx.querySelector('small'), SM_PROPS);
      }
      a.__shvRowFixed = false;
    }
  }

  function undoRows() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    if (!isDrawer()) { restoreBar(); return; }     // v243 — desktop gets the plain bar
    var rows = nav.querySelectorAll('.nav-scroll > a');
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      if (!a.__shvRowFixed) continue;              // v239 did not touch it
      a.style.removeProperty('display');
      a.style.removeProperty('grid-template-columns');
      a.style.removeProperty('align-items');
      a.style.removeProperty('max-width');
      a.style.setProperty('display', 'flex', 'important');
      a.style.setProperty('align-items', 'center', 'important');
      a.style.setProperty('width', '100%', 'important');
      var tx = a.querySelector('.dw-tx');
      if (tx) { tx.style.removeProperty('max-width'); tx.style.removeProperty('width'); tx.style.setProperty('min-width', '0', 'important'); }
      var b = a.querySelector('.dw-tx b'), sm = a.querySelector('.dw-tx small');
      if (b) { b.style.removeProperty('white-space'); b.style.removeProperty('overflow'); b.style.removeProperty('text-overflow'); b.style.removeProperty('max-width'); }
      if (sm) { sm.style.removeProperty('-webkit-line-clamp'); sm.style.removeProperty('-webkit-box-orient'); sm.style.removeProperty('display'); sm.style.removeProperty('overflow'); }
      a.__shvRowFixed = false;
    }
  }

  /* ── remove any ripple already stranded inside the drawer ─────────────── */
  function sweepRipples() {
    var nav = document.getElementById('mainNav');
    if (!nav) return;
    var strays = nav.querySelectorAll('.rip');
    for (var i = 0; i < strays.length; i++) {
      var s = strays[i], host = s.parentNode;
      if (host && host.classList) { host.classList.remove('rip-live', 'rip-pos'); host.__rip = 0; }
      s.parentNode.removeChild(s);
    }
  }

  function run() { undoRows(); sweepRipples(); }
  /* v243 — crossing the boundary (rotate, resize, a docked window) re-decides:
     leaving the drawer restores the bar, entering it hands back to the guard. */
  try {
    var mq = window.matchMedia('(max-width: 820px)');
    var onMode = function () { try { restoreBar(); } catch (e) {} undoRows(); };
    if (mq.addEventListener) mq.addEventListener('change', onMode);
    else if (mq.addListener) mq.addListener(onMode);
  } catch (e) {}
  window.addEventListener('resize', function () { if (!isDrawer()) { try { restoreBar(); } catch (e) {} } }, { passive: true });
  if (document.readyState !== 'loading') run();
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  document.addEventListener('click', function () { setTimeout(sweepRipples, 900); }, true);
  document.addEventListener('pointerup', function () { setTimeout(sweepRipples, 900); }, true);
})();
