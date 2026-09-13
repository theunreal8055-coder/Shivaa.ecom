/* ═══════════════════════════════════════════════════════════════════
   SHIVAA · v105 interaction + motion layer
   ─────────────────────────────────────────────────────────────────
   Loaded last. It never rewrites a page — it enhances what app.js,
   auth.js and trust.js have already rendered:
     01 · header search: typed-query suggestions, category chips, live
          result preview, "/" shortcut, shine + mote sweep
     02 · rates-tab glow: the glow always lands exactly two tabs ahead
          of the tab you are on, in every nav group, on every page
     03 · footer motion: scroll reveal, staggered blocks
     04 · Why Trust Shivaa: parallax orbs, tilt cards, live counters
     05 · B2B for Jewellers: floating tilt benefit cards, counters
     06 · calculator guard: an emptied number field never looks dead
   All motion is transform/opacity only and is switched off for
   prefers-reduced-motion and on touch.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.ShivaaV105) return;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const S = () => window.Shivaa || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (S().fmt ? S().fmt(n) : '₹' + Math.round(+n || 0).toLocaleString('en-IN'));
  const TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = !TOUCH && !REDUCE;

  /* ═══════════ 01 · HEADER SEARCH ═══════════ */
  const POPULAR = ['mangalsutra', 'jhumka', 'kundan', 'rani haar', 'silver payal', 'gold chain', 'bridal set', 'bangle'];

  function initSearch() {
    const wrap = $('#hdrSearchWrap'), form = $('#hdrSearch'), inp = $('#hdrSearchInput');
    const panel = $('#hsPanel'), chips = $('#hsChips'), results = $('#hsResults');
    const countEl = $('#hsCount'), allLink = $('#hsAll'), clear = $('#hdrSearchClear'), kbd = $('#hsKbd');
    if (!wrap || !inp || !panel) return;

    let cur = -1, matches = [], raf = null, opened = false;

    const products = () => (S().state && S().state.productsCache) || [];
    const priceOf = p => (S().price ? S().price(p).total : 0);

    function search(q) {
      const s = String(q || '').trim().toLowerCase();
      const all = products();
      if (!s) return { list: [], total: all.length, suggested: true };
      const terms = s.split(/\s+/).filter(Boolean);
      const hay = p => (p.name + ' ' + p.category + ' ' + (p.sku || '') + ' ' + (p.desc || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.stoneType || '')).toLowerCase();
      const scored = all.map(p => {
        const h = hay(p);
        let score = 0;
        terms.forEach(t => {
          if (!h.includes(t)) { score = -1; return; }
          if (p.name.toLowerCase().startsWith(t)) score += 6;
          else if (p.name.toLowerCase().includes(t)) score += 4;
          else score += 1;
        });
        return score < 0 ? null : { p, score };
      }).filter(Boolean);
      scored.sort((a, b) => b.score - a.score || (b.p.rating || 0) - (a.p.rating || 0));
      return { list: scored.map(x => x.p), total: scored.length, suggested: false };
    }

    function chipHTML() {
      const cats = Object.entries((S().state && S().state.catCache) || []);
      void cats;
      const list = POPULAR.slice(0, 5).map(t => `<button type="button" class="hs-chip" data-q="${esc(t)}">✦ ${esc(t)}</button>`);
      const catChips = [['rings', 'Rings'], ['necklaces', 'Necklaces'], ['earrings', 'Earrings'], ['bangles', 'Bangles'], ['mangalsutra', 'Mangalsutra'], ['silver', 'Silver 925']]
        .map(([k, n]) => `<button type="button" class="hs-chip" data-cat="${k}"><b>${n}</b></button>`);
      return `<span class="hs-chip hs-chip-k">Popular</span>` + list.join('') + catChips.join('');
    }

    function mark(text, q) {
      const t = String(text || '');
      if (!q) return esc(t);
      const i = t.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return esc(t);
      return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
    }

    function render() {
      const q = inp.value.trim();
      const r = search(q);
      matches = r.list.slice(0, 6);
      cur = -1;
      if (!q) {
        chips.innerHTML = chipHTML();
        chips.hidden = false;
        results.innerHTML = '';
        const pop = products().slice().sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
        results.innerHTML = pop.map(p => rowHTML(p, '')).join('');
        countEl.innerHTML = `<b>${r.total}</b> pieces live · showing top rated`;
        allLink.href = '#/shop';
        allLink.innerHTML = 'Browse everything <span aria-hidden="true">→</span>';
      } else {
        chips.hidden = true;
        results.innerHTML = matches.length
          ? matches.map(p => rowHTML(p, q)).join('')
          : `<div class="hs-empty">Nothing matches “${esc(q)}” yet — try <b>${esc(POPULAR[0])}</b>, or browse the full collection.</div>`;
        countEl.innerHTML = `<b>${r.total}</b> piece${r.total === 1 ? '' : 's'} match${r.total === 1 ? 'es' : ''} “${esc(q)}”`;
        allLink.href = '#/shop?q=' + encodeURIComponent(q);
        allLink.innerHTML = r.total > matches.length ? `See all ${r.total} matches <span aria-hidden="true">→</span>` : `Shop “${esc(q)}” <span aria-hidden="true">→</span>`;
      }
      $$('.hs-res', results).forEach((el, i) => {
        el.onclick = () => go(matches[i]);
        el.onmouseenter = () => setCur(i);
      });
      $$('.hs-chip[data-q]', chips).forEach(c => c.onclick = () => { inp.value = c.dataset.q; form.classList.add('filled'); render(); inp.focus(); });
      $$('.hs-chip[data-cat]', chips).forEach(c => c.onclick = () => { close(); location.hash = '#/shop?category=' + c.dataset.cat; });
    }

    function rowHTML(p, q) {
      const cat = (p.category || '').replace(/^\w/, c => c.toUpperCase());
      return `<div class="hs-res" role="option" aria-selected="false" data-id="${esc(p.id)}">
        <img src="${esc((p.images && p.images[0]) || '/images/logo.png')}" alt="" loading="lazy">
        <span class="hs-tx"><b>${mark(p.name, q)}</b><small>${esc(cat)} · ${esc(String(p.weightG))} g · ${p.metal === 'Silver' ? 'Silver ' + esc(p.purity) : esc(p.purity) + ' gold'}</small></span>
        <span class="hs-pr">${fmt(priceOf(p))}</span>
      </div>`;
    }

    function go(p) {
      if (!p) return;
      close();
      inp.blur();
      location.hash = '#/product/' + p.id;
    }
    function setCur(i) {
      cur = i;
      $$('.hs-res', results).forEach((el, j) => { el.classList.toggle('cur', j === i); el.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
    }
    function open() {
      if (opened) return;
      opened = true;
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('open'));
      inp.setAttribute('aria-expanded', 'true');
      wrap.classList.add('hs-open');
      render();
    }
    function close() {
      if (!opened) return;
      opened = false;
      panel.classList.remove('open');
      inp.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('hs-open');
      setTimeout(() => { if (!opened) panel.hidden = true; }, 280);
    }

    inp.addEventListener('focus', open);
    inp.addEventListener('input', () => {
      form.classList.toggle('filled', !!inp.value);
      if (clear) clear.hidden = !inp.value;
      if (kbd) kbd.style.opacity = inp.value ? '0' : '';
      panel.classList.add('hs-busy');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { render(); panel.classList.remove('hs-busy'); });
      if (!opened) open();
    });
    inp.addEventListener('keydown', e => {
      const n = $$('.hs-res', results).length;
      if (e.key === 'ArrowDown') { e.preventDefault(); setCur((cur + 1) % Math.max(1, n)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCur((cur - 1 + n) % Math.max(1, n)); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (cur >= 0 && matches[cur]) return go(matches[cur]);
        const v = inp.value.trim();
        close();
        location.hash = v ? '#/shop?q=' + encodeURIComponent(v) : '#/shop';
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); close(); inp.blur(); }   // ✕ clears, Esc just closes
    });
    if (clear) clear.addEventListener('click', () => { inp.value = ''; form.classList.remove('filled'); clear.hidden = true; render(); inp.focus(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = inp.value.trim();
      close();
      if (v) location.hash = '#/shop?q=' + encodeURIComponent(v);
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
    // "/" focuses the search from anywhere (unless you are already typing)
    document.addEventListener('keydown', e => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!wrap.getClientRects().length) return;    // search is hidden on narrow screens
      e.preventDefault(); inp.focus(); inp.select();
    });
    render();
  }

  /* ═══════════ 02 · RATES-TAB GLOW — exactly two tabs ahead ═══════════ */
  const ALIAS = {
    home: 'home', shop: 'shop', product: 'shop', p: 'shop', cart: 'shop', checkout: 'shop',
    compare: 'shop', catalogues: 'catalogues', rates: 'rates', buyback: 'buyback',
    savings: 'savings', metal: 'metal', services: 'services', b2b: 'b2b', partner: 'b2b',
    about: 'about', contact: 'contact', trust: 'trust', hallmark: 'hallmark', privacy: 'privacy',
    faq: 'faq', track: 'track', account: 'account', wishlist: 'account', order: 'account',
    invoice: 'account', login: 'account', deadstock: 'deadstock',
  };
  const GROUPS = [
    () => $$('#mainNav .nav-scroll a[href^="#/"]'),
    () => $$('.footer .f-cols .foot-col a[href^="#/"]'),
    () => $$('.foot-chips a[href^="#/"]'),
    () => $$('.mnav a[href^="#/"]'),
    () => $$('.f-crest .trust-footer-links a[href^="#/"]'),
  ];
  function linkKey(a) {
    const h = (a.getAttribute('href') || '').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
    return h.length ? (ALIAS[h[0]] || h[0]) : 'home';
  }
  function applyTabGlow(overrideKey) {
    const seg = (location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean));
    /* v106 — a tap moves the glow immediately (before the hash settles), so the
       effect answers the finger instead of glowing on regardless. */
    const key = overrideKey || (seg.length ? (ALIAS[seg[0]] || seg[0]) : 'home');
    GROUPS.forEach(get => {
      let list;
      try { list = get(); } catch (e) { return; }
      if (!list || !list.length) return;
      list.forEach(a => a.classList.remove('tab-ahead'));
      let at = list.findIndex(a => linkKey(a) === key);
      if (at < 0) at = list.findIndex(a => linkKey(a) === 'home');
      if (at < 0) at = 0;
      const target = list[(at + 2) % list.length];     // ← always exactly two ahead
      if (target) {
        target.classList.add('tab-ahead');
        target.setAttribute('data-glow-reason', 'two tabs after ' + key);
      }
    });
  }

  /* ═══════════ 03 · FOOTER MOTION (scroll reveal) ═══════════ */
  function initFooterMotion() {
    const footer = $('.footer');
    if (!footer || footer.dataset.v105) return;
    footer.dataset.v105 = '1';
    const blocks = $$('.f-cornice, .f-crest, .f-ticker, .f-gst, .trust-footer-links, .f-brand-col, .foot-col, .fl-news, .f-wordmark, .foot-chips, .pay-strip, .foot-legal', footer);
    blocks.forEach((el, i) => { el.setAttribute('data-frev', ''); el.style.transitionDelay = (Math.min(i, 10) * 55) + 'ms'; });
    if (!('IntersectionObserver' in window) || REDUCE) { blocks.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .08, rootMargin: '0px 0px -40px' });
    blocks.forEach(el => io.observe(el));
    // social icons: stagger a one-time shimmer when the footer first appears
    const soc = $$('.foot-social a', footer);
    soc.forEach((a, i) => a.style.setProperty('--d', (i * 140) + 'ms'));
  }

  /* ═══════════ shared motion helpers ═══════════ */
  function tilt3d(el, opts) {
    if (!FINE || el._t3d) return;
    el._t3d = true;
    const k = (opts && opts.k) || 7;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * k}deg) rotateY(${(px - 0.5) * k * 1.25}deg) translate3d(0,-6px,0)`;
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }
  function parallax(el, strength) {
    if (!FINE || !el || el._px) return;
    el._px = true;
    let ticking = false;
    const upd = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = `translate3d(0, ${(-k * strength).toFixed(1)}px, 0)`;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }
  function countUp(el, target, opts) {
    if (!el || el._cu === target) return;
    const o = opts || {};
    const from = el._cu || 0;
    el._cu = target;
    const prefix = o.prefix || '', suffix = o.suffix || '', dec = o.dec || 0;
    if (REDUCE) { el.textContent = prefix + target.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; return; }
    const t0 = performance.now(), dur = o.dur || 1300;
    el.classList.add('tick');
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const v = from + (target - from) * e;
      el.textContent = prefix + v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (k < 1) requestAnimationFrame(step); else el.classList.remove('tick');
    })(t0);
  }
  function reveal(scope, sel) {
    const els = $$(sel, scope);
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || REDUCE) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), i * 70); io.unobserve(e.target); }
    }), { threshold: .1, rootMargin: '0px 0px -30px' });
    els.forEach(e => { if (e._rvObs) return; e._rvObs = io; io.observe(e); });
  }

  /* ═══════════ 04 · WHY TRUST SHIVAA ═══════════ */
  // Pages are made of several sibling <section>s, so everything is queried
  // from #view and guarded per element — a re-render simply re-enhances the
  // fresh nodes and never double-binds the old ones.
  function enhanceTrust(view) {
    if (!view) return;
    $$('.t-orb', view).forEach((o, i) => parallax(o, 42 + i * 26));
    const principle = $('.trust-principle', view);
    if (principle) tilt3d(principle, { k: 5 });
    $$('.tstat, .trust-card, .trust-document', view).forEach(c => tilt3d(c, { k: 4.5 }));
    $$('.tstat, .trust-card, .trust-document, .trust-disclosure, .trust-next', view).forEach((el, i) => {
      el.classList.add('t-rv');
      if (!el.style.transitionDelay) el.style.transitionDelay = (Math.min(i, 9) * 65) + 'ms';
    });
    reveal(view, '.t-rv');
    bindCounters(view);
    // the hero GSTIN plaque is injected once trust.js resolves the profile
    const heroG = $('#trustHeroGstin', view);
    if (heroG && !heroG.dataset.v105Copy && heroG.querySelector('.tg-copy')) {
      heroG.dataset.v105Copy = '1';
      const copy = $('.tg-copy', heroG), code = $('code', heroG);
      copy.onclick = async () => {
        const v = code ? code.textContent.trim() : '';
        if (!v) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(v);
          else throw new Error('no clipboard');
          copy.textContent = 'Copied ✓';
        } catch (e) {
          if (code) { const r = document.createRange(); r.selectNodeContents(code); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
          copy.textContent = 'Press ⌘/Ctrl+C';
        }
        setTimeout(() => { copy.textContent = 'Copy GSTIN'; }, 2400);
      };
      heroG.classList.add('t-rv');
      reveal(view, '#trustHeroGstin.t-rv');
    }
  }
  function bindCounters(root) {
    const st = S().state || {};
    const prods = st.productsCache || [];
    const cats = new Set(prods.map(p => p.category)).size;
    const mc = (st.mcTable || []).length;
    $$('[data-count-to]', root).forEach(el => {
      if (el._cuBound) return;
      el._cuBound = true;
      const raw = el.dataset.countTo;
      const target = raw === 'designs' ? prods.length : raw === 'cats' ? cats : raw === 'mc' ? mc : (parseFloat(raw) || 0);
      const suffix = el.dataset.countSuffix || '';
      const opts = { suffix, dec: +(el.dataset.countDec || 0), dur: 1500 };
      el.textContent = '0' + suffix;
      if (!('IntersectionObserver' in window)) { countUp(el, target, opts); return; }
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        countUp(e.target, target, opts);
      }), { threshold: .35 });
      io.observe(el);
    });
  }

  /* ═══════════ 05 · B2B FOR JEWELLERS ═══════════ */
  function enhanceB2B(view) {
    if (!view) return;
    $$('.wp-card', view).forEach((c, i) => {
      tilt3d(c, { k: 8 });
      if (!c.style.animationDelay) c.style.animationDelay = (i * 60) + 'ms';
      c.classList.add('t-rv');
    });
    $$('.alt-btn, .b2b-stat, .b2b-form-card, .vault-card', view).forEach(c => tilt3d(c, { k: 3 }));
    $$('.city-chips span', view).forEach((c, i) => { if (!c.style.animationDelay) c.style.animationDelay = (i * 55) + 'ms'; });
    $$('.b2b-stat, .wp-head, .b2b-form-card', view).forEach((el, i) => {
      el.classList.add('t-rv');
      if (!el.style.transitionDelay) el.style.transitionDelay = (Math.min(i, 10) * 55) + 'ms';
    });
    reveal(view, '.t-rv');
    // counters: only animate a stat that is a single clean number (+ suffix).
    // "70–80 kg" or "Every Friday" is copy, not a counter — leave it alone.
    $$('.b2b-stat b', view).forEach(el => {
      if (el._cuBound) return;
      const txt = el.textContent.trim();
      if (!/^[\d][\d,]*(\.\d+)?\s*\+?\s*[%×x]?$/.test(txt)) return;
      el._cuBound = true;
      const m = txt.match(/^([\d.,]+)/);
      const target = parseFloat(m[1].replace(/,/g, ''));
      const suffix = txt.slice(m[1].length);
      el.textContent = '0' + suffix;
      if (!('IntersectionObserver' in window)) { countUp(el, target, { suffix, dur: 1400 }); return; }
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        countUp(e.target, target, { suffix, dur: 1400 });
      }), { threshold: .5 });
      io.observe(el);
    });
  }

  /* ═══════════ 06 · CALCULATOR GUARD ═══════════ */
  function initCalcGuard() {
    const sel = '.bb-calc input[type=number], .sv-calc input[type=number], .svc-amt-row input, .bbc-wt input';
    const bind = () => $$(sel).forEach(inp => {
      if (inp._cg) return;
      inp._cg = true;
      const upd = () => {
        const empty = String(inp.value).trim() === '';
        inp.classList.toggle('is-empty', empty);
        if (empty && !inp.placeholder) inp.placeholder = inp.getAttribute('data-ph') || '0';
      };
      inp.setAttribute('data-ph', inp.placeholder || '');
      inp.addEventListener('input', upd);
      inp.addEventListener('focus', () => { try { inp.select(); } catch (e) {} });
      inp.addEventListener('blur', () => {
        // never leave a calculator looking blank — fall back to the slider value
        if (String(inp.value).trim() === '') {
          const r = inp.closest('.fld') && inp.closest('.fld').querySelector('input[type=range]');
          if (r) { inp.value = r.value; inp.dispatchEvent(new Event('input', { bubbles: true })); }
        }
        upd();
      });
      upd();
    });
    bind();
    return bind;
  }

  /* ═══════════ route-aware wiring ═══════════ */
  let calcBind = null;
  function run() {
    const page = (document.body.dataset && document.body.dataset.page) || '';
    const view = $('#view');
    try { applyTabGlow(); } catch (e) {}
    try { initFooterMotion(); } catch (e) {}
    if (!calcBind) calcBind = initCalcGuard();
    try { calcBind(); } catch (e) {}
    if (!view) return;
    if (page === 'trust') enhanceTrust(view);
    if (page === 'b2b') enhanceB2B(view);
  }

  function boot() {
    initSearch();
    run();
    addEventListener('hashchange', () => setTimeout(run, 30));
    // trust.js renders its profile asynchronously — re-enhance when it lands
    const view = $('#view');
    if (view && 'MutationObserver' in window) {
      let queued = false;
      const mo = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; run(); });
      });
      mo.observe(view, { childList: true, subtree: true });
    }
    // rates refresh → footer ticker already re-renders; keep the glow in sync
    document.addEventListener('rates', () => setTimeout(run, 60));

    /* v106 — interaction feedback: acknowledge the press, move the glow to two
       tabs ahead of the link just pressed, and stop animating while the tab is
       in the background (a glow nobody is looking at is just burned frames). */
    document.addEventListener('pointerdown', e => {
      const a = e.target.closest && e.target.closest('.footer a, .mnav a, .nav a, .foot-chips a, .dw-row, .trust-footer-links a, .f-cornice a');
      if (!a) return;
      a.classList.add('tab-press');
      setTimeout(() => a.classList.remove('tab-press'), 460);
      try { const k = linkKey(a); if (k) applyTabGlow(k); } catch (err) {}
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('is-hidden', !!document.hidden);
      if (!document.hidden) setTimeout(run, 80);
    });
    setTimeout(run, 600);
    setTimeout(run, 2000);
  }

  window.ShivaaV105 = { run, applyTabGlow, initSearch };
  window.Shivaa = window.Shivaa || {};
  window.Shivaa.v105 = {
    afterRender: () => { try { applyTabGlow(); } catch (e) {} },
    tilt3d, countUp, reveal, parallax,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
