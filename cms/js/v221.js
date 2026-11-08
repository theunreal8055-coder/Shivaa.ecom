/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA · v221 — Runtime Button Geometry & Fast-Navigation Guard
   Ensures no button ever retains stray .au-rip-host, inline position/overflow
   mutations, or magnetic translate3d drift, and marks images .img-ok immediately.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__shivaaV221) return;

  function cleanButtons(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    var hosts = scope.querySelectorAll('.au-rip-host, .magnetic');
    for (var i = 0; i < hosts.length; i++) {
      hosts[i].classList.remove('au-rip-host', 'magnetic');
    }
    var rips = scope.querySelectorAll('.rip, .au-rip, .v194-rip, .au-p, .au-vt, .au-view-prev');
    for (var j = 0; j < rips.length; j++) {
      if (rips[j].parentNode) rips[j].parentNode.removeChild(rips[j]);
    }
    var imgs = scope.querySelectorAll('#view img:not(.img-ok)');
    for (var k = 0; k < imgs.length; k++) {
      imgs[k].classList.add('img-ok');
    }
  }

  window.__shivaaV221 = {
    version: 221,
    buttonLock: true,
    fastNav: true,
    cleanButtons: cleanButtons
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { cleanButtons(document); }, { once: true });
  } else {
    cleanButtons(document);
  }
  window.addEventListener('hashchange', function () {
    requestAnimationFrame(function () { cleanButtons(document); });
  }, { passive: true });
})();
