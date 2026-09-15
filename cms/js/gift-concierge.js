/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA · GIFT CONCIERGE — restored layer                        (v42 → v115-FI)
   ───────────────────────────────────────────────────────────────────────────
   v42 put a four-question gift finder on the home page. A later home rewrite
   dropped the section, its handlers AND its stylesheet, and nothing noticed
   until the v115-FI lineage audit (tools/fresh-install/lineage-audit.py) found
   css/gift-concierge.css sitting in the v42 archive with no counterpart in the
   tree. This file brings the feature back — as a LAYER, exactly the way v107
   ships its UX additions: it mounts itself into the rendered home view, reads
   the live catalogue through the store's own exports, and disappears completely
   if you delete its two tags in index.html.

   What it does, in one line: four taps (who · when · budget · style) → the three
   real pieces from today's catalogue that fit, priced by the store's own rate
   engine, then a WhatsApp hand-off so a human can take it from there.

   Rules this file lives by (the house rules for layers):
     · never throw — every feature is wrapped, a broken concierge must not take
       the home page with it;
     · never invent — no product it did not read from /api/products, no price it
       computed itself (Shivaa.price is the single source, the same one the shop
       grid, Quick View and checkout use), no promise the store cannot keep;
     · if the catalogue is empty (a store that has not been stocked yet) the
       section is not rendered at all — an empty quiz is worse than no quiz.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__SHV_GIFTC__) return;
  window.__SHV_GIFTC__ = 1;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const SH = () => window.Shivaa || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'shv_gift_concierge';
  const RM = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── the scoring recipes, unchanged from v42 (tags/categories are real fields) */
  const PROFILE = {
    recipient: {
      mother: { tags: ['heritage', 'wedding', 'festive'], cats: ['necklaces', 'earrings', 'bangles', 'pendants', 'mangalsutra'], wt: 1.0 },
      wife: { tags: ['luxe', 'heritage', 'wedding', 'new'], cats: ['rings', 'necklaces', 'bangles', 'pendants', 'bracelets', 'chains'], wt: 1.0 },
      daughter: { tags: ['daily', 'new', 'festive'], cats: ['earrings', 'rings', 'chains', 'pendants', 'nosepins', 'bracelets'], wt: 1.0 },
      bride: { tags: ['wedding', 'heritage', 'luxe'], cats: ['necklaces', 'bangles', 'earrings', 'rings', 'mangalsutra', 'aad', 'sheeshphool', 'bajubandh', 'bridalanklets', 'hathphool'], wt: 1.2 },
      friend: { tags: ['gifting', 'daily', 'festive', 'new'], cats: ['earrings', 'pendants', 'chains', 'rings', 'silver'], wt: 1.0 },
      self: { tags: ['new', 'bestseller', 'heritage', 'daily'], cats: null, wt: 1.0 },
    },
    occasion: {
      wedding: { tags: ['wedding', 'heritage', 'luxe'], cats: ['necklaces', 'bangles', 'earrings', 'mangalsutra', 'rings'], wt: 1.2 },
      anniversary: { tags: ['gifting', 'luxe'], cats: ['rings', 'pendants', 'bracelets', 'chains', 'necklaces'], wt: 1.0 },
      birthday: { tags: ['gifting', 'new'], cats: ['earrings', 'rings', 'pendants', 'chains'], wt: 1.0 },
      festive: { tags: ['festive', 'heritage'], cats: ['earrings', 'necklaces', 'bangles', 'chains', 'pendants', 'rakhdi'], wt: 1.0 },
      milestone: { tags: ['gifting', 'daily', 'heritage'], cats: ['chains', 'rings', 'earrings', 'pendants', 'silver'], wt: 1.0 },
      justbecause: { tags: ['gifting', 'daily', 'new'], cats: ['earrings', 'chains', 'pendants', 'nosepins', 'silver'], wt: 0.9 },
    },
    style: {
      traditional: { tags: ['heritage', 'festive', 'wedding'], cats: ['necklaces', 'bangles', 'earrings', 'mangalsutra', 'aad', 'rakhdi', 'bajubandh'], wt: 1.1 },
      modern: { tags: ['new', 'daily'], cats: ['rings', 'chains', 'pendants', 'bracelets', 'earrings', 'nosepins'], wt: 1.0 },
      bridal: { tags: ['wedding', 'luxe', 'heritage'], cats: ['necklaces', 'bangles', 'earrings', 'rings', 'mangalsutra', 'bridalanklets', 'hathphool'], wt: 1.3 },
      versatile: { tags: ['daily', 'new'], cats: ['earrings', 'rings', 'chains', 'pendants', 'bracelets', 'nosepins'], wt: 1.0 },
    },
  };
  const LABELS = {
    recipient: { mother: 'Mother / Mother-in-law', wife: 'Wife / Partner', daughter: 'Daughter / Sister', bride: 'Bride-to-be', friend: 'Friend / Colleague', self: 'Myself' },
    occasion: { wedding: 'Wedding / Reception', anniversary: 'Anniversary', birthday: 'Birthday', festive: 'Festive / Diwali', milestone: 'A milestone', justbecause: 'Just because' },
    style: { traditional: 'Traditional / Heritage', modern: 'Modern / Minimal', bridal: 'Bridal / Statement', versatile: 'Versatile / Daily' },
  };
  const STEPS = [
    { q: 'recipient', h: 'Who is the gift for?', s: 'We lean on style and weight, not guesswork.', c3: 1,
      opts: [['mother', '👩‍🦱', 'Mother / Mother-in-law', 'Elegant, traditional, weight that feels solid'],
             ['wife', '💍', 'Wife / Partner', 'Romantic, heirloom feel, pieces she will wear daily'],
             ['daughter', '🌸', 'Daughter / Sister', 'Young, light, versatile — office and festive'],
             ['bride', '👰', 'Bride-to-be', 'Bridal sets, kundan, statement heirlooms'],
             ['friend', '🎁', 'Friend / Colleague', 'Thoughtful, versatile, kind on the budget'],
             ['self', '✨', 'Myself (a self-gift)', 'Something you have had your eye on']] },
    { q: 'occasion', h: 'What is the occasion?', s: 'It tunes the formality and the motifs.', c3: 1,
      opts: [['wedding', '💒', 'Wedding / Reception', 'Bridal, kundan, heavy haar and chokers'],
             ['anniversary', '💞', 'Anniversary', 'Meaningful — rings, pendants, bracelets'],
             ['birthday', '🎂', 'Birthday', 'Personal and fun — earrings, chains, pendants'],
             ['festive', '🪔', 'Festive / Diwali', 'Traditional shine for muhurat and puja'],
             ['milestone', '🎓', 'A milestone', 'Graduation, new job, a first salary'],
             ['justbecause', '🌷', 'Just because', 'No reason needed — a small, fine thing']] },
    { q: 'budget', h: 'What is your budget?', s: 'Today’s price is what the rate engine says — not a rounded estimate.', slider: 1 },
    { q: 'style', h: 'Their style?', s: 'The last one, then we shortlist.', c3: 1,
      opts: [['traditional', '🏛️', 'Traditional / Heritage', 'Kundan, meenakari, temple motifs, Rajasthani'],
             ['modern', '⚡', 'Modern / Minimal', 'Clean lines, geometric, everyday wear'],
             ['bridal', '👑', 'Bridal / Statement', 'Heavy sets, chokers, bridal kadas'],
             ['versatile', '🌿', 'Versatile / Daily', 'Lightweight, office-to-festive']] },
  ];

  /* ── money: always through the store's own engine ────────────────────────── */
  function priceOf(p) {
    const S = SH();
    try {
      if (typeof S.price === 'function') {
        const r = S.price(p);
        const t = r && (r.total || r.total === 0 ? r.total : null);
        if (t) return Math.round(Number(t));
      }
    } catch (e) { /* fall through to a stored price */ }
    const raw = p && (p.priceTotal || (p.price && p.price.total) || p.price);
    return raw ? Math.round(Number(raw)) : 0;
  }
  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
  function products() {
    const S = SH();
    const list = (S.state && S.state.productsCache) || [];
    return Array.isArray(list) ? list.filter(p => p && p.active !== false) : [];
  }

  /* ── state ───────────────────────────────────────────────────────────────── */
  const st = { step: 1, answers: { recipient: null, occasion: null, budget: null, style: null }, done: false };
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s && s.answers) { st.answers = Object.assign(st.answers, s.answers); st.done = !!s.done; st.step = s.done ? 5 : (s.step || 1); return true; }
    } catch (e) {}
    return false;
  }

  /* ── markup ────────────────────────────────────────────────────────────────── */
  function budgetBounds() {
    const ps = products().map(priceOf).filter(Boolean).sort((a, b) => a - b);
    if (!ps.length) return { lo: 5000, hi: 150000, def: 30000, step: 1000 };
    const lo = Math.max(2000, Math.floor(ps[0] / 1000) * 1000);
    const hi = Math.max(lo + 20000, Math.ceil(ps[ps.length - 1] / 1000) * 1000);
    const mid = ps[Math.floor(ps.length / 2)];
    return { lo, hi, def: Math.min(hi, Math.max(lo, Math.round(mid / 1000) * 1000)), step: Math.max(500, Math.round((hi - lo) / 40 / 500) * 500) };
  }
  function optHTML(o) {
    const [val, ic, title, sub] = o;
    return `<button type="button" class="gc-opt" data-val="${esc(val)}" aria-pressed="false">`
      + `<span class="gc-ic" aria-hidden="true">${ic}</span><span><b>${esc(title)}</b><span>${esc(sub)}</span></span>`
      + `<span class="gc-check" aria-hidden="true">✓</span></button>`;
  }
  function panelHTML(step, i) {
    const b = step.slider ? budgetBounds() : null;
    const body = step.slider
      ? `<div class="gc-bud">
           <output class="gc-bud-out" id="gcBudDisp">${inr(st.answers.budget || b.def)}</output>
           <input type="range" id="gcBudRange" min="${b.lo}" max="${b.hi}" step="${b.step}"
                  value="${esc(st.answers.budget || b.def)}" aria-label="Budget in rupees">
           <div class="gc-chips" id="gcBudChips">
             ${[0.35, 0.6, 1, 1.6].map(f => Math.round(b.lo + (b.hi - b.lo) * f / 1000) * 1000)
               .filter((v, k, a) => a.indexOf(v) === k)
               .map(v => `<button type="button" class="gc-chip" data-val="${v}">${inr(v)}</button>`).join('')}
           </div>
           <p class="gc-note">Pieces below are matched to this number the way checkout prices them: metal at the
             live Jaipur rate + your making charge + GST. A budget never hides a “starting from” price.</p>
         </div>`
      : `<div class="gc-opts${step.c3 ? ' c3' : ''}" data-q="${esc(step.q)}">
           ${step.opts.map(optHTML).join('')}
         </div>`;
    return `<div class="gc-panel${i + 1 === st.step ? ' active' : ''}" data-step="${i + 1}"${step.q && !step.slider ? ` data-q="${esc(step.q)}"` : ''}>
        <h3 class="gc-q">${esc(step.h)}<small>${esc(step.s)}</small></h3>
        ${body}
        <div class="gc-nav">
          ${i ? '<button type="button" class="btn btn-ghost gc-prev">← Back</button>' : '<span></span>'}
          <button type="button" class="btn btn-gold gc-next"${i + 1 === STEPS.length ? '' : ' disabled'}>
            ${i + 1 === STEPS.length ? 'Show my three pieces →' : 'Next →'}</button>
        </div>
      </div>`;
  }
  function sectionHTML() {
    return `<section class="gift-concierge gc-in" id="giftConcierge" aria-label="Gift Concierge">
      <div class="container">
        <div class="gc-head">
          <div class="gc-kicker">Gift Concierge</div>
          <h2>Find the <em>right</em> piece</h2>
          <p>Four quick answers, and we shortlist from today’s live catalogue — the same pieces,
             the same rates, the same breakdown the shop shows.</p>
          <div class="gc-sub">60 seconds · no login · nothing is reserved until you enquire</div>
        </div>
        <div class="gc-quiz">
          <div class="gc-progress" id="gcProgress">
            ${STEPS.map((x, i) => `<div class="gc-step${i + 1 === st.step ? ' active' : ''}" data-i="${i + 1}"><i></i></div>`).join('')}
          </div>
          ${STEPS.map(panelHTML).join('')}
          <div class="gc-results${st.done ? ' active' : ''}" id="gcResults">
            <div class="gc-recap" id="gcRecap"></div>
            <h3>Shortlisted <em>from the live catalogue</em></h3>
            <span class="gc-sub">Priced at today’s rate · tap any piece for the full breakdown</span>
            <div class="gc-grid" id="gcGrid"></div>
            <div class="gc-foot">
              <p>Want a human eye on it? Send this brief to a Shivaa advisor on WhatsApp — we will
                 talk through weight, making charge and what we can cast to order.</p>
              <button type="button" class="btn btn-gold" id="gcWA">Chat on WhatsApp</button>
              <button type="button" class="gc-restart" id="gcRestart">↻ Start over</button>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ── behaviour ───────────────────────────────────────────────────────────── */
  function root() { return $('#giftConcierge'); }
  function setStep(n) {
    st.step = Math.max(1, Math.min(STEPS.length + 1, n));
    const r = root(); if (!r) return;
    $$('.gc-step', r).forEach((s, i) => {
      s.classList.toggle('done', i + 1 < st.step);
      s.classList.toggle('active', i + 1 === st.step);
    });
    $$('.gc-panel', r).forEach(p => p.classList.toggle('active', Number(p.dataset.step) === st.step));
    $('#gcResults', r).classList.toggle('active', st.step > STEPS.length);
    if (st.step > STEPS.length) showResults(); else refreshNext();
    save();
  }
  function refreshNext() {
    const r = root(); if (!r) return;
    const panel = $(`.gc-panel[data-step="${st.step}"]`, r); if (!panel) return;
    const next = $('.gc-next', panel); if (!next) return;
    const q = STEPS[st.step - 1] && STEPS[st.step - 1].q;
    const ok = q ? !!st.answers[q] : true;
    next.disabled = !ok;
    $$('.gc-opt', panel).forEach(o => {
      const on = q && st.answers[q] === o.dataset.val;
      o.classList.toggle('on', !!on);
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function score(p) {
    let s = 0;
    const tags = new Set(p.tags || []);
    const cat = String(p.category || '').toLowerCase();
    const price = priceOf(p);
    const bud = Number(st.answers.budget) || 0;
    if (bud) {
      if (price && price <= bud) s += 20 + (1 - Math.abs(price / bud - 0.75)) * 15;
      else if (price && price <= bud * 1.25) s += 10 - ((price - bud) / bud) * 30;
      else s -= 40;
      if (price && price < bud * 0.25) s -= 10;
    }
    [PROFILE.recipient[st.answers.recipient], PROFILE.occasion[st.answers.occasion], PROFILE.style[st.answers.style]]
      .filter(Boolean).forEach(sig => {
        if (sig.tags) sig.tags.forEach(t => { if (tags.has(t)) s += 8 * sig.wt; });
        if (sig.cats) sig.cats.forEach(c => { if (cat.indexOf(c) >= 0) s += 5 * sig.wt; });
      });
    if (tags.has('gifting')) s += 6;
    if (tags.has('bestseller')) s += 4;
    if (tags.has('new')) s += 2;
    if (+p.rating) s += Math.min(5, +p.rating);
    if (p.active === false || (typeof p.stock === 'number' && p.stock <= 0)) s -= 100;
    return s;
  }
  function pick() {
    const scored = products().map(p => ({ p, s: score(p) })).sort((a, b) => b.s - a.s);
    const out = []; const used = new Set();
    for (const { p } of scored) {
      if (out.length >= 3) break;
      const cat = String(p.category || '').toLowerCase();
      if (used.has(cat) && used.size < 3) continue;      // keep the three varied
      if (p.active === false) continue;
      out.push(p); used.add(cat);
    }
    if (out.length < 3) for (const { p } of scored) { if (out.length >= 3) break; if (out.indexOf(p) < 0) out.push(p); }
    return out.slice(0, 3);
  }
  function briefText() {
    const a = st.answers;
    return ['Gift brief — Shivaa',
      'For: ' + (LABELS.recipient[a.recipient] || '—'),
      'Occasion: ' + (LABELS.occasion[a.occasion] || '—'),
      'Budget: ' + (a.budget ? inr(a.budget) : '—'),
      'Style: ' + (LABELS.style[a.style] || '—')].join('\n');
  }
  function showResults() {
    const r = root(); if (!r) return;
    const picked = pick();
    const a = st.answers;
    $('#gcRecap', r).innerHTML = `<span>${esc(LABELS.recipient[a.recipient] || '')}</span>`
      + `<span>${esc(LABELS.occasion[a.occasion] || '')}</span>`
      + `<span>${a.budget ? 'under ' + esc(inr(a.budget)) : ''}</span>`
      + `<span>${esc(LABELS.style[a.style] || '')}</span>`;
    const grid = $('#gcGrid', r);
    if (!picked.length) {
      grid.innerHTML = `<div class="gc-empty" style="grid-column:1/-1">
          <h4>Nothing in the catalogue fits that brief</h4>
          <p>${products().length ? 'Right now ' + products().length + ' designs are listed, and none sits under ' + esc(inr(a.budget || 0))
            + ' with that style. Try a wider budget or a different style.'
            : 'The catalogue has no pieces listed yet.'}</p>
          <a class="btn btn-gold" href="#/quote">Ask the workshop to cast it</a>
          <p class="gc-note">A custom order is quoted on the live rate the day we make it — nothing is invented here.</p>
        </div>`;
    } else {
      const S = SH();
      grid.innerHTML = picked.map(p => (typeof S.productCard === 'function'
        ? S.productCard(p)
        : `<article class="p-card" data-pid="${esc(p.id)}"><a href="#/product/${esc(p.id)}"><img src="${esc((p.images && p.images[0]) || '/images/logo.png')}" alt="${esc(p.name)}"></a>
            <b>${esc(p.name)}</b><span>${esc(inr(priceOf(p)))}</span></article>`)).join('');
      // let the shop's own card wiring (Quick View / compare / wish) bind to these cards
      try { if (typeof S.redraw === 'function' && S.__gcSkip !== 1) { /* cards are static HTML; handlers use delegation */ } } catch (e) {}
    }
    const wa = $('#gcWA', r);
    if (wa) wa.onclick = () => {
      const S = SH();
      const lines = picked.map(p => '• ' + p.name + ' — ' + inr(priceOf(p)) + (p.sku ? ' (' + p.sku + ')' : ''));
      const msg = briefText() + (lines.length ? '\n\nShortlisted:\n' + lines.join('\n') : '\n\nNo piece matched — please suggest something.') + '\n';
      try {
        if (typeof S.waOpen === 'function') S.waOpen(msg);
        else if (typeof S.waLink === 'function') window.open(S.waLink(msg), '_blank');
        else if (typeof S.toast === 'function') S.toast('WhatsApp is not wired on this install yet');
      } catch (e) { /* a blocked popup must not break the page */ }
    };
    const rs = $('#gcRestart', r);
    if (rs) rs.onclick = () => {
      st.answers = { recipient: null, occasion: null, budget: null, style: null };
      st.done = false;
      $$('.gc-opt.on', r).forEach(o => o.classList.remove('on'));
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      setStep(1);
      if (!RM() && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    st.done = true; save();
  }

  function bind() {
    const r = root(); if (!r || r.dataset.gcBound === '1') return;
    r.dataset.gcBound = '1';
    r.addEventListener('click', e => {
      const opt = e.target.closest('.gc-opt');
      if (opt) {
        const panel = opt.closest('.gc-panel');
        const q = panel && panel.dataset.q;
        $$('.gc-opt', panel).forEach(o => { o.classList.remove('on'); o.setAttribute('aria-pressed', 'false'); });
        opt.classList.add('on'); opt.setAttribute('aria-pressed', 'true');
        if (q) st.answers[q] = opt.dataset.val;
        refreshNext(); save();
        return;
      }
      if (e.target.closest('.gc-next')) { setStep(st.step + 1); return; }
      if (e.target.closest('.gc-prev')) { setStep(st.step - 1); return; }
    });
    r.addEventListener('input', e => {
      if (e.target.id !== 'gcBudRange') return;
      const v = Number(e.target.value);
      st.answers.budget = v;
      const disp = $('#gcBudDisp', r); if (disp) disp.textContent = inr(v);
      $$('.gc-chip', r).forEach(b => b.classList.toggle('on', Number(b.dataset.val) === v));
      const panel = e.target.closest('.gc-panel');
      const next = panel && $('.gc-next', panel); if (next) next.disabled = false;
      save();
    });
    r.addEventListener('click', e => {
      const chip = e.target.closest('.gc-chip'); if (!chip) return;
      const rng = $('#gcBudRange', r);
      if (rng) { rng.value = chip.dataset.val; rng.dispatchEvent(new Event('input', { bubbles: true })); }
      $$('.gc-chip', r).forEach(b => b.classList.toggle('on', b === chip));
    });
    // keyboard: arrows move through an option row (it is a radio group in spirit)
    r.addEventListener('keydown', e => {
      if (!/Arrow(Right|Left|Up|Down)/.test(e.key)) return;
      const opt = e.target.closest('.gc-opt'); if (!opt) return;
      const list = $$('.gc-opt', opt.closest('.gc-panel'));
      const i = list.indexOf(opt);
      const n = list[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length];
      if (n) { e.preventDefault(); n.focus(); }
    });
  }

  function ready() {
    const S = SH();
    return S && S.state && Array.isArray(S.state.productsCache) && S.state.productsCache.length > 0;
  }
  function paint() {
    const view = $('#view');
    if (!view) return;
    const hash = location.hash.replace(/^#\/?/, '');
    if (hash !== '' && hash !== '/') { if (root()) root().remove(); return; }
    if (!ready()) return;
    if (!root()) {
      const nl = $('.newsletter', view);
      const before = nl ? (nl.closest('section') || nl) : null;
      const host = document.createElement('div');
      host.className = 'gc-mount';
      host.innerHTML = sectionHTML();
      if (before && before.parentNode === view) view.insertBefore(host, before);
      else view.appendChild(host);
      restore();
      if (st.answers.budget == null) st.answers.budget = budgetBounds().def;
      bind();
      refreshNext();
      if (st.step > STEPS.length) setStep(STEPS.length + 1);
    } else {
      bind();
    }
  }
  let armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    const go = () => { try { paint(); } catch (e) { /* a broken layer must never break the store */ } };
    window.addEventListener('hashchange', () => setTimeout(go, 60));
    new MutationObserver(() => setTimeout(go, 80)).observe(document.body, { childList: true, subtree: true });
    go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm, { once: true });
  else arm();
})();
