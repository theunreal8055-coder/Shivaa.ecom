/* ═══════════════════════════════════════════════════════════════════
   SHIVAA · v89 motion engine (global polish layer)
   Self-contained, defensive by design:
   · every entrance needs a class this file adds — no JS = fully visible
   · prefers-reduced-motion disables every non-essential effect
   · observers no-op where the browser lacks them (older webviews/tests)
   · only transform/opacity animations; all listeners passive
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js-motion');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const view = $('#view');

  /* ── 1. tactile ripple on every button ─────────────────────────────── */
  if (!reduced) {
    function ripple(x, y, btn) {
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 1.15;
      const s = document.createElement('span');
      s.className = 'rip';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (x - r.left - size / 2) + 'px';
      s.style.top = (y - r.top - size / 2) + 'px';
      btn.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest && e.target.closest('.btn');
      if (!btn || e.pointerType === '') return;
      ripple(e.clientX, e.clientY, btn);
    }, { passive: true, capture: true });
    // keyboard activation (Enter/Space) — detail is 0 for synthetic clicks
    document.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      const btn = e.target.closest && e.target.closest('.btn');
      if (btn) { const r = btn.getBoundingClientRect(); ripple(r.left + r.width / 2, r.top + r.height / 2, btn); }
    }, { capture: true });
  }

  /* ── 2. page entrances (only on real route changes) ───────────────── */
  const GRID_SEL = '.p-grid,.fine-grid,.fin-grid3,.vault-grid,.rte-grid,.cmp-grid,.care-grid,.hscroll,' +
    '.adm-table tbody,.mc-table tbody,.cart-items,.catbar2,.acct-tiles,.stat-grid,.svc-grid,.b2b-grid,.m-stagger';
  function tagStaggers(scope) {
    $$(GRID_SEL, scope).forEach((g, gi) => {
      g.classList.add('m-stagger');
      Array.from(g.children).slice(0, 18).forEach((c, i) => c.style.setProperty('--i', i));
    });
  }
  function playPage() {
    if (reduced || !view) return;
    view.classList.remove('pg');
    void view.offsetWidth;                 // restart the entrance reliably
    view.classList.add('pg');
    Array.from(view.children).slice(0, 10).forEach((c, i) => c.style.setProperty('--i', i));
    tagStaggers(view);
    requestAnimationFrame(() => { sweepCounts(); sweepImages(); });
  }
  if (view && 'MutationObserver' in window) {
    new MutationObserver((muts) => {
      const replaced = muts.some(m => m.target === view &&
        Array.from(m.addedNodes).some(n => n.nodeType === 1));
      if (replaced) playPage();
    }).observe(view, { childList: true });

    /* surgically replaced lists (shop filters, admin table refreshes) */
    new MutationObserver((muts) => {
      if (reduced) return;
      let n = 0;
      for (const m of muts) {
        if (m.type !== 'childList' || !m.target.matches || !m.target.closest('#view')) continue;
        if (!m.target.matches || !m.target.matches(GRID_SEL)) continue;
        m.target.classList.add('m-stagger');
        m.addedNodes.forEach(nd => {
          if (nd.nodeType !== 1 || n >= 18) return;
          nd.classList.add('m-in');
          nd.style.setProperty('--i', n++);
        });
      }
    }).observe(view, { childList: true, subtree: true });
  }

  /* ── 3. photography blur-up ───────────────────────────────────────── */
  function revealImg(t) { t.classList.add('img-ok'); }
  document.addEventListener('load', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest && t.closest('#view')) revealImg(t);
  }, true);
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest && t.closest('#view')) revealImg(t); // onerror swaps to a fallback
  }, true);
  function sweepImages() {
    $$('#view img').forEach(img => { if (img.complete) revealImg(img); });
  }

  /* ── 4. count-up for dashboard stats ──────────────────────────────── */
  const countIO = ('IntersectionObserver' in window)
    ? new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); }
      }), { threshold: 0.4 })
    : null;
  function animateCount(el) {
    if (el._cntUp) return;
    const raw = (el.textContent || '').trim();
    const mt = raw.match(/^([^\d.-]*?)(\d[\d,]*\.?\d*)([\s\S]*?)$/);
    if (!mt) { el._cntUp = true; return; }
    const pre = mt[1], post = mt[3];
    const target = parseFloat(mt[2].replace(/,/g, ''));
    if (!isFinite(target)) { el._cntUp = true; return; }
    const dec = (mt[2].split('.')[1] || '').length;
    el._cntUp = true;
    if (reduced || !target) return;
    const t0 = performance.now(), dur = target > 999 ? 950 : 700;
    const fmt = v => v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(Math.round(target * e * 1e3) / 1e3) + post;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function sweepCounts() {
    if (!countIO) return;
    $$('#view .stat b, #view [data-countup]').forEach(el => {
      if (el._cntUp) return;
      if (/^\s*[^\d.-]*?\d[\d,]*\.?\d*\s*$/.test(el.textContent || '')) countIO.observe(el);
    });
  }

  /* ── 5. toasts get an icon + aria politeness ──────────────────────── */
  const toastWrap = $('#toastWrap');
  if (toastWrap && 'MutationObserver' in window) {
    toastWrap.setAttribute('aria-live', 'polite');
    new MutationObserver(() => {
      Array.from(toastWrap.children).forEach(t => {
        if (t._ticDone || !t.classList.contains('toast')) return;
        t._ticDone = true;
        const bad = /\berr(or)?\b/.test(t.className);
        const ic = document.createElement('span');
        ic.className = 'tic ' + (bad ? 'bad' : 'ok');
        ic.textContent = bad ? '!' : '✓';
        t.prepend(ic);
      });
    }).observe(toastWrap, { childList: true });
  }

  /* ── 6. cart / wish counters pop on change ───────────────────────── */
  const badge = $('#cartCount');
  if (badge && 'MutationObserver' in window) {
    let bumping = false;
    const bump = () => {
      // never watch attributes here — toggling .bump would re-fire this forever
      if (bumping) return;
      bumping = true;
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
      setTimeout(() => { badge.classList.remove('bump'); bumping = false; }, 600);
    };
    // content changes (app sets the count text) are childList/characterData
    new MutationObserver(bump).observe(badge, { childList: true, characterData: true, subtree: true });
  }

  /* ── 7. invalid fields shake instead of silently failing ─────────── */
  document.addEventListener('invalid', (e) => {
    const ctl = e.target;
    if (!ctl || !ctl.form) return;
    ctl.classList.add('invalid');
    const fld = ctl.closest('.fld') || ctl.parentElement;
    if (fld && !reduced) {
      fld.classList.remove('shake');
      void fld.offsetWidth;
      fld.classList.add('shake');
      setTimeout(() => fld.classList.remove('shake'), 480);
    }
  }, true);
  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList) e.target.classList.remove('invalid');
  }, { passive: true, capture: true });

  /* tiny public hook (also used by tests) */
  window.ShivaaMotion = { playPage, tagStaggers, sweepCounts, sweepImages, reduced };

  /* ── 8. idle sweeps for late renders ──────────────────────────────── */
  const kick = () => { sweepImages(); sweepCounts(); };
  setTimeout(kick, 400); setTimeout(kick, 1400);
  if (!reduced && view) {
    // re-tag staggers once images/lists arrive late (async tab data)
    const t = setInterval(() => { tagStaggers(view); }, 1200);
    setTimeout(() => clearInterval(t), 8000);
  }
})();
