/* ═══════════════════════════════════════════════════════════════════
   SHIVAA v122 — design-desk sticky bill bar.
   The desk total lives at the top of a 65-design grid; jewellers lost it
   the moment they scrolled. This bar floats the running bill (count + fine
   grams + Proceed) once the top total scrolls out of view — and only while
   something is actually selected. It mirrors the compare-tray pattern:
   visibility is IntersectionObserver-driven (no scroll listener), the WhatsApp
   float lifts via body.has-dsbar, and everything hides off-desk.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__shv122) return;
  window.__shv122 = true;

  var bar = null, io = null, totalNode = null, totalVisible = false;

  function onDesk() {
    return /^#\/catalogues\b/.test(location.hash || '') && !!document.getElementById('dsGrid');
  }
  function selectedCount() {
    var sel = window._sel || {}, n = 0;
    Object.keys(sel).forEach(function (k) { if (sel[k] > 0) n++; });
    return n;
  }
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'dsBar';
    bar.className = 'ds-bar';
    bar.hidden = true;
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<div class="ds-bar-copy"><b id="dsBarFine">0.00 g fine</b>' +
      '<small id="dsBarCount">0 designs</small></div>' +
      '<button type="button" class="btn btn-primary" id="dsBarGo">Proceed → Bill</button>';
    document.body.appendChild(bar);
    bar.querySelector('#dsBarGo').addEventListener('click', function () {
      try { window.ShivaaDS && window.ShivaaDS.proceed(); } catch (e) {}
    });
    return bar;
  }
  function watchTotal() {
    var t = document.querySelector('.ds-total');
    if (t === totalNode) return;
    totalNode = t;
    if (!t || !io) { totalVisible = !t; return; }
    try { io.disconnect(); } catch (e) {}
    try { io.observe(t); } catch (e) { totalVisible = false; }
  }
  function sync() {
    if (!onDesk()) {
      if (bar) bar.hidden = true;
      document.body.classList.remove('has-dsbar');
      totalNode = null;
      return;
    }
    watchTotal();
    var n = selectedCount();
    var b = ensureBar();
    var fine = document.getElementById('dsFine');
    var count = document.getElementById('dsCount');
    if (fine) b.querySelector('#dsBarFine').textContent = fine.textContent;
    if (count) b.querySelector('#dsBarCount').textContent = count.textContent;
    var show = n > 0 && !totalVisible;
    b.hidden = !show;
    document.body.classList.toggle('has-dsbar', show);
  }
  function wrap() {
    try {
      if (window.ShivaaDS && !window.ShivaaDS.updateBar._dsb) {
        var orig = window.ShivaaDS.updateBar.bind(window.ShivaaDS);
        var fn = function () { orig(); sync(); };
        fn._dsb = true;
        window.ShivaaDS.updateBar = fn;
      }
    } catch (e) {}
  }

  try {
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { totalVisible = e.isIntersecting; });
        sync();
      });
    }
  } catch (e) { io = null; }

  window.addEventListener('hashchange', function () { wrap(); sync(); });
  document.addEventListener('DOMContentLoaded', function () { wrap(); sync(); }, { once: true });
  wrap();
  sync();
})();
