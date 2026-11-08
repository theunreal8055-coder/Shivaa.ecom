/* v194 — full-app mobile fit + fluid motion.
   v221 update: zero-jank passive section tagging only.
   Button ripple span injection and synchronous getComputedStyle / inline
   position+overflow mutations on pointerdown were retired in v221 because
   mutating inline position/overflow and injecting 300px spans caused flex
   buttons to jump out of their layout spaces and expand on click. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !document.addEventListener) return;
  if (window.__shivaaV194) return;
  window.__shivaaV194 = true;

  var reduced = false;
  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = !!(mq && mq.matches);
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) { reduced = !!e.matches; });
    }
  } catch (_) {}

  function tagSections() {
    if (reduced) return;
    var view = document.getElementById('view');
    if (!view) return;
    var kids = view.children;
    for (var i = 0; i < kids.length && i < 4; i++) {
      var k = kids[i];
      if (k && k.classList && !k.classList.contains('v194-fade-in')) {
        k.classList.add('v194-fade-in');
      }
    }
  }

  window.addEventListener('hashchange', function () {
    requestAnimationFrame(tagSections);
  }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tagSections, { once: true });
  } else {
    tagSections();
  }
})();
