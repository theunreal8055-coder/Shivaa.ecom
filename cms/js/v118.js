/* SHIVAA v118 — category navigation safety net */
'use strict';
(function () {
  /* A category link can be tapped twice while its hash is already current.
     Browsers do not fire hashchange for the same URL, so explicitly redraw in
     that one case. Normal links retain native hash navigation. */
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href^="#/shop?category="]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const key = new URLSearchParams(href.split('?')[1] || '').get('category') || '';
    if (!/^[a-z0-9_-]{1,32}$/i.test(key)) { e.preventDefault(); return; }
    if (location.hash === href && window.Shivaa && Shivaa.redraw) {
      e.preventDefault();
      Shivaa.redraw();
    }
  }, true);
})();
