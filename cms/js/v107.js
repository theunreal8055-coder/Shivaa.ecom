/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v107 · ENHANCEMENT LAYER                                    (v107)
   Loaded last, after aurum.js. Same philosophy as motion.js / aurum.js:
   self-contained, defensive, and removable — delete the <link>/<script>
   tags in index.html and the shop is byte-for-byte v104 again.

   Everything v105/v106 prototyped that the live v104 line did not already
   have lands here, written against the LIVE markup (not the old repo):
     1  footer rate ticker + honest "spot + premium" basis line
     2  tap-reactive glow (tab-ahead), press feedback, hidden-tab pause
     3  Quick View operability guards (scroll reset, focus, skip link)
     4  full design detail sheet on Design Desk cards
     5  #/size-guide — true-scale ring size page (writes shv_ring_size,
        the exact key v104's Quick View pre-selects)
     6  order payment/fulfilment timeline + account refund tracker
     7  checkout: fee lines on the method picker + rate-lock hint
     8  GST block on the invoice page (GSTIN, place of supply, HSN)
     9  honest code-delivery line on the Passport sheet
    10  PWA "update ready" bar + offline banner
    11  pathname → hash normaliser so /shop deep links land correctly

   Rules this file lives by: never throw (every feature is wrapped), never
   re-declare a v104 selector in CSS (see css/v107.css), never store secrets,
   never animate while the tab is hidden or the user prefers reduced motion.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__SHV_V107__) return;
  window.__SHV_V107__ = 1;

  /* ── tiny helpers (fall back to our own when Shivaa is not up yet) ───── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SH = () => window.Shivaa || {};
  const fmt = n => (SH().fmt ? SH().fmt(n) : '₹' + Number(n || 0).toLocaleString('en-IN'));
  const fmt2 = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inrTime = iso => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        hour12: true, timeZone: 'Asia/Kolkata'
      }) + ' IST';
    } catch (e) { return String(iso || '').slice(0, 16); }
  };
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[v107] ' + name + ':', e && e.message); } };
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* wrap an existing SPA route so we can decorate AFTER v104 paints it.
     Keeps the original promise contract intact (route() attaches .catch). */
  function wrapRoute(name, enhance) {
    const R = SH().routes;
    if (!R || typeof R[name] !== 'function' || R[name].__v107) return;
    const orig = R[name];
    const wrapped = function (view, q, id) {
      const out = orig.apply(this, arguments);
      Promise.resolve(out).then(() => {
        // only decorate if the route is still the one on screen
        if ((location.hash || '#/').indexOf('#/' + name) !== 0 && name !== 'home') return;
        try { enhance(view, q, id); } catch (e) { console.warn('[v107] ' + name + ' enhance:', e && e.message); }
      }).catch(() => {});
      return out;
    };
    wrapped.__v107 = 1;
    R[name] = wrapped;
  }

  /* ═══ 1 · FOOTER RATE TICKER + BASIS LINE ═══════════════════════════════ */
  let tickPrev = null;
  function tickCells(rates) {
    const defs = [
      ['24K', rates.gold24, fmt], ['22K', rates.gold22, fmt],
      ['18K', rates.gold18, fmt], ['Silver', rates.silver, fmt2]
    ];
    return defs.map(d => {
      const cur = Number(d[1]);
      if (!isFinite(cur)) return '';
      let cls = 'flat', arrow = '· steady';
      if (tickPrev && isFinite(tickPrev[d[0]])) {
        const diff = cur - tickPrev[d[0]];
        if (diff > 0) { cls = 'up'; arrow = '▲ ' + d[2](diff) + ' since your last visit'; }
        else if (diff < 0) { cls = 'down'; arrow = '▼ ' + d[2](-diff) + ' since your last visit'; }
      }
      return `<div class="v107-cell ${cls}"><small>${d[0]} · per gram</small><b>${d[2](cur)}</b><i>${arrow}</i></div>`;
    }).join('');
  }
  function renderTicker() {
    const host = $('#v107FootTicker');
    const st = SH().state;
    if (!host || !st || !st.rates || !st.rates.gold22) { if (host) host.hidden = true; return; }
    host.hidden = false;
    const r = st.rates, set = st.settings || {};
    const cells = tickCells(r);
    tickPrev = { '24K': Number(r.gold24), '22K': Number(r.gold22), '18K': Number(r.gold18), 'Silver': Number(r.silver) };
    const premG = Number(set.jaipurPremium), premS = Number(set.jaipurSilverPremium);
    const basis = (isFinite(premG) && isFinite(premS))
      ? `How this price is built: live bullion spot <b>${fmt2(r.gold22)}/g (22K)</b> + <b>${fmt2(premG)}/g</b> Jaipur making &amp; freight premium (silver +${fmt2(premS)}/g) · GST extra at checkout · rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''}.`
      : `Rates re-checked every 10 minutes${r.t ? ' · last update ' + inrTime(r.t) : ''} · GST extra at checkout.`;
    host.innerHTML =
      `<div class="v107-tick" role="list" aria-label="Today's metal rates per gram">${cells}</div>` +
      `<p class="v107-basis"><span class="live-dot" aria-hidden="true"></span>${basis}</p>`;
  }
  function footerTicker() {
    const foot = $('footer');
    if (!foot || $('#v107FootTicker')) return;
    const host = document.createElement('div');
    host.id = 'v107FootTicker';
    foot.appendChild(host);
    renderTicker();
    setInterval(() => safe('ticker', renderTicker), 2500);
    window.addEventListener('hashchange', () => safe('ticker', renderTicker));
  }

  /* ═══ 2 · TAP-REACTIVE GLOW + PRESS FEEDBACK + HIDDEN-TAB PAUSE ═════════ */
  const TAB_ORDER = ['home', 'shop', 'rates', 'hallmark', 'trust', 'savings', 'b2b', 'finale', 'about', 'contact'];
  function currentRoute() {
    const m = (location.hash || '#/').match(/^#\/([a-z-]+)/);
    return m ? m[1] : 'home';
  }
  function footChips() {
    return $$('.foot-chips a[href^="#/"], .fv-chips a[href^="#/"]');
  }
  function applyTabGlow(override) {
    if (reduced()) return;
    const cur = override || currentRoute();
    const i = TAB_ORDER.indexOf(cur);
    const ahead = i >= 0 ? TAB_ORDER[(i + 2) % TAB_ORDER.length] : null;   // glow two steps on
    footChips().forEach(a => {
      const key = (a.getAttribute('href') || '').replace('#/', '').split('?')[0] || 'home';
      a.classList.toggle('tab-ahead', !!ahead && key === ahead);
    });
  }
  function tabGlow() {
    footChips().forEach(a => a.classList.add('v107-tabglow'));
    document.addEventListener('pointerdown', e => {
      const a = e.target.closest && e.target.closest('.v107-tabglow');
      if (a) setTimeout(() => applyTabGlow((a.getAttribute('href') || '').replace('#/', '').split('?')[0]), 0);
    }, true);
    window.addEventListener('hashchange', () => applyTabGlow());
    applyTabGlow();
    setInterval(() => safe('glow', () => applyTabGlow()), 8000);
  }
  function pressFeedback() {
    const sel = '.foot-chips a, .fv-chips a, .ds-card, .btn, .pay-opt, .v107-sg-pick, .qv-nav button';
    const arm = () => $$(sel).forEach(el => { if (!el.classList.contains('v107-press')) el.classList.add('v107-press'); });
    arm();
    new MutationObserver(() => setTimeout(arm, 60)).observe(document.body, { childList: true, subtree: true });
  }
  function hiddenPause() {
    const set = () => document.body.classList.toggle('is-hidden', document.hidden);
    document.addEventListener('visibilitychange', set);
    set();
  }

  /* ═══ 3 · QUICK VIEW OPERABILITY GUARDS ═════════════════════════════════ */
  function qvGuard() {
    const fix = qv => {
      if (!qv || qv.__v107qv) return;
      qv.__v107qv = 1;
      // scroll every scrollable pane back to the top (stale scroll strands
      // the buy row below the fold on short phones)
      [qv].concat($$('.qv-media, .qv-info, .qv-body', qv)).forEach(el => { el.scrollTop = 0; });
      // keyboard/AT users get a skip link straight to the buy row
      if (!$('.v107-skip', qv)) {
        const skip = document.createElement('a');
        skip.className = 'v107-skip';
        skip.href = '#qvBuyRow';
        skip.textContent = 'Skip to price & size';
        skip.addEventListener('click', e => {
          e.preventDefault();
          const buy = $('.qv-add, .qv-buy, [id^="qvAdd"]', qv) || $('.qv-info', qv);
          if (buy) { buy.setAttribute('tabindex', '-1'); buy.focus({ preventScroll: false }); buy.scrollIntoView({ block: 'nearest' }); }
        });
        qv.appendChild(skip);
      }
      // focus lands inside the sheet so Escape/arrow keys work immediately
      setTimeout(() => {
        const f = $('.qv-close, [data-close], button', qv);
        if (f && document.activeElement === document.body) f.focus({ preventScroll: true });
      }, 30);
    };
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.classList && n.classList.contains('qv')) fix(n);
        const q = n.querySelector && n.querySelector('.qv');
        if (q) fix(q);
      }));
    }).observe(document.body, { childList: true, subtree: true });
    const existing = $('.qv');
    if (existing) fix(existing);
  }

  /* ═══ 4 · FULL DESIGN DETAIL SHEET ═════════════════════════════════════ */
  function ddsButton(p) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'v107-dds-btn';
    b.title = 'Full design details';
    b.setAttribute('aria-label', 'Full details for ' + (p.name || 'this design'));
    b.textContent = 'ⓘ';
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      openDetailSheet(p);
    });
    return b;
  }
  function armDdsButtons() {
    $$('.ds-card').forEach(card => {
      if ($('.v107-dds-btn', card)) return;
      const id = (card.id || '').replace('ds-', '');
      const p = (SH().state && SH().state.productsCache || []).find(x => x.id === id);
      if (p) card.appendChild(ddsButton(p));
    });
  }
  function openDetailSheet(p) {
    const S = SH();
    const pr = S.price ? S.price(p) : null;
    const less = Number(p.lessWeightG || 0) + Math.round(Number(p.weightG || 0) * Number(p.wastagePct || 0) / 100 * 100) / 100;
    const net = Math.max(0, Number(p.weightG || 0) - less);
    const fineP = ({ '24K': 0.999, '22K': 0.916, '18K': 0.75 })[p.purity] || 0.916;
    const rows = [
      ['Gross weight', (p.weightG || 0) + ' g'],
      ['Less (wastage + stones)', '− ' + (Math.round(less * 100) / 100) + ' g'],
      ['Net metal weight', (Math.round(net * 100) / 100) + ' g'],
      ['Metal · purity', esc(p.metal || 'Gold') + ' · ' + esc(p.purity || '22K') + ' (' + Math.round(fineP * 1000) / 10 + '% fine)'],
      ['Fine metal content', (Math.round(net * fineP * 100) / 100) + ' g fine'],
      ['Stone', p.stoneType ? esc(p.stoneType) + (p.stoneColour ? ' · ' + esc(p.stoneColour) : '') : 'Plain metal'],
      ['Making charges', p.mcScheme === 'percent' ? p.mcValue + '% of metal' : p.mcScheme === 'perGram' ? fmt(p.mcValue) + '/g' : fmt(p.mcValue) + ' flat'],
      ['Sizes', (p.sizes || []).length ? (p.sizes || []).map(esc).join(', ') : 'Free size'],
      ['In stock', (p.stock == null ? 'made to order' : p.stock + ' pcs')],
      ['Hallmark', 'BIS 916 hallmarked · HUID on request']
    ];
    if (pr) {
      rows.push(['Metal value @ ' + fmt2(pr.ratePerGram) + '/g', fmt(pr.metalValue)]);
      rows.push(['Making', fmt(pr.makingCharge)]);
      if (pr.stoneValue) rows.push(['Stone', fmt(pr.stoneValue)]);
      rows.push(['GST 3%', fmt(pr.gst)]);
    }
    const savedQty = (window._sel && window._sel[p.id]) || 0;
    (S.openModal || window.openModal || function () {})(`
      <div class="v107-dds" role="dialog" aria-label="Design details">
        <h3 style="margin:0 0 4px">${esc(p.name || '')}</h3>
        <small style="color:var(--ink-3)">${esc(p.sku || p.id)}${p.category ? ' · ' + esc(p.category) : ''}</small>
        ${rows.map(r => `<div class="row${/^GST|Metal value/.test(r[0]) ? '' : ''}"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}
        ${pr ? `<div class="row total"><span>You pay today</span><b>${fmt(pr.total)}</b></div>` : ''}
        <div class="row"><span>Quantity for this design</span>
          <b class="v107-qty"><button type="button" id="v107qMinus" aria-label="One less">−</button><b id="v107qVal">${savedQty}</b><button type="button" id="v107qPlus" aria-label="One more">+</button></b></div>
        <div class="v107-tl-actions">
          <button type="button" class="btn btn-primary btn-sm" id="v107ddsWa">Enquire on WhatsApp</button>
          <button type="button" class="btn btn-ghost btn-sm" id="v107ddsGo">Open product page</button>
        </div>
        <p class="v107-lock-hint">Weights are gross; final invoice settles on certified net metal. Stone weights are excluded from metal, as per BIS practice.</p>
      </div>`);
    const qv = $('#v107qVal');
    if (qv) {
      const set = d => {
        window._sel = window._sel || {};
        const next = Math.max(0, Math.min(50, (parseInt(qv.textContent, 10) || 0) + d));
        window._sel[p.id] = next;
        qv.textContent = next;
        const card = $('#ds-' + p.id);
        if (card) card.classList.toggle('on', next > 0);
        const fine = $('#dsFineVal');
        if (fine && SH().state && SH().state.rates) {
          const per = SH().price ? SH().price(p).total : 0;
          let tot = 0;
          Object.keys(window._sel).forEach(k => {
            const pp = (SH().state.productsCache || []).find(x => x.id === k);
            if (pp) tot += (SH().price ? SH().price(pp).total : 0) * (window._sel[k] || 0);
          });
          fine.textContent = fmt(tot);
        }
      };
      const minus = $('#v107qMinus'), plus = $('#v107qPlus');
      if (minus) minus.onclick = () => set(-1);
      if (plus) plus.onclick = () => set(1);
    }
    const wa = $('#v107ddsWa');
    if (wa) wa.onclick = () => { const f = S.waProductMsg || S.waLink; if (f) window.open(f(p), '_blank', 'noopener'); };
    const go = $('#v107ddsGo');
    if (go) go.onclick = () => { (S.closeModal || function () {})(); location.hash = '#/product/' + p.id; };
  }
  function designDetail() {
    armDdsButtons();
    new MutationObserver(() => setTimeout(armDdsButtons, 80)).observe(document.body, { childList: true, subtree: true });
  }

  /* ═══ 5 · #/size-guide — TRUE-SCALE RING SIZER ══════════════════════════ */
  /* Indian sizes → inner circumference (mm), the chart our counter staff use */
  const RING_MM = [[8, 48.0], [9, 49.3], [10, 50.6], [11, 51.9], [12, 53.1], [13, 54.4], [14, 55.7],
  [15, 57.0], [16, 58.3], [17, 59.5], [18, 60.8], [19, 62.1], [20, 63.4],
  [21, 64.6], [22, 65.9], [23, 67.2], [24, 68.5], [25, 69.7], [26, 71.0]];
  const PX_PER_MM = 3.4;
  function ringSvg(diamMm, sel) {
    const r = (diamMm / 2) * PX_PER_MM;
    const c = r + 3;
    return `<svg width="${(c * 2).toFixed(1)}" height="${(c * 2).toFixed(1)}" viewBox="0 0 ${(c * 2).toFixed(1)} ${(c * 2).toFixed(1)}" aria-hidden="true">
      <circle cx="${c}" cy="${c}" r="${r.toFixed(2)}" fill="none" stroke="${sel ? '#b98a2e' : '#8a6a3a'}" stroke-width="2.4"/></svg>`;
  }
  function pickSize(n) {
    try { localStorage.setItem('shv_ring_size', String(n)); } catch (e) {}
    $$('.v107-sg-pick').forEach(el => el.classList.toggle('on', el.dataset.size === String(n)));
    const saved = $('#v107sgSaved');
    if (saved) saved.innerHTML = `✓ Size <b>${n}</b> saved on this device — Quick View now pre-selects it on every ring.`;
    const S = SH();
    if (S.toast) S.toast('Ring size ' + n + ' saved — rings will open pre-selected');
  }
  function sizeGuidePage(view) {
    let saved = '';
    try { saved = localStorage.getItem('shv_ring_size') || ''; } catch (e) {}
    view.innerHTML = `
      <div class="page-head"><h1>Ring size guide</h1><p>True-scale circles, Indian sizes. Hold a ring you already own over your screen (or print at 100%) and match the inside edge.</p></div>
      <div class="v107-sg-hero">
        <svg viewBox="0 0 200 26" width="200" height="26" aria-label="50 mm scale check">
          ${Array.from({ length: 51 }, (_, i) => `<line x1="${(i * (PX_PER_MM)).toFixed(2)}" y1="${i % 10 === 0 ? 2 : 10}" x2="${(i * PX_PER_MM).toFixed(2)}" y2="18" stroke="#8a6a3a" stroke-width="${i % 10 === 0 ? 1.4 : 0.7}"/>`).join('')}
          <text x="0" y="25" font-size="7" fill="#8a6a3a">0</text><text x="${(50 * PX_PER_MM - 8).toFixed(0)}" y="25" font-size="7" fill="#8a6a3a">50 mm — check with a ruler</text>
        </svg>
        <div class="note">If the bar above does not measure exactly 50 mm, zoom your browser until it does.</div>
      </div>
      <div class="v107-sg-find">
        <input id="v107sgMm" inputmode="decimal" placeholder="Or type your inner diameter in mm (e.g. 17.3)">
        <button class="btn btn-primary btn-sm" id="v107sgFind">Find my size</button>
        <span class="res" id="v107sgRes"></span>
      </div>
      <div class="v107-sg-grid" role="listbox" aria-label="Ring sizes">
        ${RING_MM.map(([n, circ]) => {
      const d = circ / Math.PI;
      return `<button type="button" class="v107-sg-pick ${String(n) === saved ? 'on' : ''}" data-size="${n}" role="option" aria-selected="${String(n) === saved}">
            ${ringSvg(d, String(n) === saved)}<b>Size ${n}</b><small>⌀ ${d.toFixed(2)} mm</small></button>`;
    }).join('')}
      </div>
      <div class="v107-sg-saved" id="v107sgSaved" ${saved ? '' : 'hidden'}>${saved ? `✓ Size <b>${esc(saved)}</b> saved on this device — Quick View now pre-selects it on every ring.` : ''}</div>
      <p class="v107-lock-hint">Between two sizes? Take the larger one for comfort fit, the smaller for a snug fit on thin bands. Our <a href="#/sizer">printable sizer</a> measures your finger directly.</p>`;
    $$('.v107-sg-pick', view).forEach(b => b.onclick = () => pickSize(b.dataset.size));
    const find = $('#v107sgFind', view);
    if (find) find.onclick = () => {
      const mm = parseFloat(($('#v107sgMm', view) || {}).value || '');
      const res = $('#v107sgRes', view);
      if (!isFinite(mm) || mm < 12 || mm > 25) { res.textContent = 'Enter a diameter between 12 and 25 mm'; return; }
      let best = RING_MM[0], bd = 99;
      RING_MM.forEach(([n, circ]) => { const d = Math.abs(circ / Math.PI - mm); if (d < bd) { bd = d; best = [n, circ]; } });
      res.innerHTML = `Closest: <b>size ${best[0]}</b> (⌀ ${(best[1] / Math.PI).toFixed(2)} mm, off by ${bd.toFixed(2)} mm)`;
      pickSize(best[0]);
    };
  }
  function sizeGuideRoute() {
    const R = SH().routes;
    if (!R || R['size-guide']) return;
    R['size-guide'] = view => { sizeGuidePage(view); };
    // footer door
    const chips = $('.foot-chips, .fv-chips');
    if (chips && !$('#v107sgLink')) {
      const a = document.createElement('a');
      a.id = 'v107sgLink';
      a.href = '#/size-guide';
      a.textContent = 'Ring size guide';
      a.className = 'v107-tabglow';
      chips.appendChild(a);
    }
    // link from the existing printable sizer page
    wrapRoute('sizer', view => {
      if ($('#v107sgX', view)) return;
      const p = document.createElement('p');
      p.id = 'v107sgX';
      p.className = 'v107-lock-hint';
      p.innerHTML = 'Prefer matching a ring you own? Use the <a href="#/size-guide"><b>true-scale size guide</b></a> — it saves your size for Quick View.';
      view.appendChild(p);
    });
  }

  /* ═══ 6 · ORDER TIMELINE + ACCOUNT REFUND TRACKER ═══════════════════════ */
  const FULFIL = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
  function tlHTML(steps) {
    const doneCount = steps.filter(s => s.state === 'done').length;
    const prog = steps.length ? Math.round((doneCount - 0.5) / steps.length * 100) : 0;
    return `<div class="v107-tl" style="--v107-prog:${Math.max(4, prog)}%">` + steps.map(s =>
      `<div class="v107-step ${s.state}"><b>${s.title}${s.amt ? ' <span class="amt">· ' + fmt(s.amt) + '</span>' : ''}</b><small>${esc(s.sub || '')}</small></div>`
    ).join('') + `</div>`;
  }
  function orderTimeline(view, q, id) {
    const S = SH();
    if (!S.api || !id) return;
    S.api('/api/orders/' + encodeURIComponent(id)).then(res => {
      const o = (res && res.order) || res;
      if (!o || !o.id || !$('#view').contains(view)) return;
      const pays = o.payments || [], refs = o.refunds || [];
      const idx = FULFIL.indexOf(o.status);
      const steps = [];
      steps.push({
        state: 'done', title: 'Order placed',
        sub: inrTime(o.createdAt) + ' · ' + fmt(o.total) + (o.rateLock && o.rateLock.stampedAt ? ' · rate locked at order time' : '')
      });
      const paid = (o.amountPaid || 0) > 0;
      steps.push({
        state: paid ? 'done' : (o.status === 'Cancelled' ? 'fail' : 'now'),
        title: paid ? 'Payment received' : 'Payment pending',
        sub: pays.length
          ? pays.map(p => (p.mode || 'online') + ' ' + (p.status || '') + (p.at ? ' · ' + inrTime(p.at) : '')).join(' · ')
          : (o.paymentStatus || 'awaiting payment'),
        amt: paid ? (o.amountPaid || 0) : null
      });
      if (o.balance > 0 && o.paymentStatus !== 'Refunded') {
        steps.push({ state: 'now', title: 'Balance due before dispatch', sub: 'Pay the remainder to release your piece', amt: o.balance });
      }
      FULFIL.slice(1).forEach((st, i) => {
        if (o.status === 'Cancelled') { if (i === 0) steps.push({ state: 'fail', title: 'Cancelled', sub: o.cancelReason || 'cancelled before dispatch' }); return; }
        if (idx > i) steps.push({ state: 'done', title: st, sub: st === 'Confirmed' ? 'payment verified · packing at the Jaipur atelier' : '' });
        else if (idx === i) steps.push({ state: 'now', title: st, sub: st === 'Confirmed' ? 'being hallmarked & packed' : st === 'Shipped' ? 'in transit — tracking on WhatsApp' : '' });
      });
      refs.forEach(r => steps.push({
        state: r.status === 'refunded' || r.status === 'exchanged' ? 'done' : r.status === 'rejected' ? 'fail' : 'now',
        title: (r.kind === 'exchange' ? 'Exchange' : 'Refund') + ' · ' + (r.status || 'requested'),
        sub: r.status === 'refunded' ? 'amount released — banks settle in 5–7 days' : 'under review',
        amt: r.amount
      }));
      const box = document.createElement('div');
      box.className = 'v107-tlwrap';
      box.innerHTML = `<h3 style="margin:18px 0 2px">Where your order is</h3>` + tlHTML(steps) +
        (o.balance > 0 ? `<div class="v107-tl-note err">A balance of <b>${fmt(o.balance)}</b> is due before dispatch — pay from the order page and the timeline moves the moment it is verified.</div>` : '') +
        (refs.length ? `<div class="v107-tl-note">Refunds travel back the way you paid. Gateway refunds settle in 5–7 working days after approval.</div>` : '');
      view.appendChild(box);
    }).catch(() => {});
  }
  function refundTracker(view) {
    const S = SH();
    if (!S.api || !S.token || !S.token()) return;
    S.api('/api/refunds/mine').then(list => {
      const items = Array.isArray(list) ? list : (list && list.refunds) || [];
      if (!items.length || !$('#view').contains(view)) return;
      const STATES = ['requested', 'approved', 'refunded'];
      const box = document.createElement('div');
      box.innerHTML = `<h3 style="margin:20px 0 2px">Your refunds &amp; exchanges</h3>` + items.slice(0, 8).map(r => {
        const i = STATES.indexOf(String(r.status || '').toLowerCase());
        const steps = [
          { state: 'done', title: 'Requested', sub: inrTime(r.createdAt || r.at) + (r.kind ? ' · ' + esc(r.kind) : '') },
          { state: i >= 1 ? 'done' : 'now', title: 'Approved', sub: i >= 1 ? 'owner approved' : 'owner is reviewing (up to 48 h)' },
          { state: i >= 2 ? 'done' : (String(r.status) === 'rejected' ? 'fail' : ''), title: String(r.status) === 'rejected' ? 'Could not be approved' : 'Amount released', sub: String(r.status) === 'rejected' ? (r.note || 'see WhatsApp') : i >= 2 ? 'banks settle in 5–7 working days' : '' }
        ];
        return `<div style="margin:10px 0 4px"><b style="font-size:13px">Order ${esc(r.orderId || r.id || '')}</b>${r.amount ? ' · ' + fmt(r.amount) : ''}</div>` + tlHTML(steps);
      }).join('');
      view.appendChild(box);
    }).catch(() => {});
  }

  /* ═══ 7 · CHECKOUT: FEE LINES ON THE METHOD PICKER + LOCK HINT ══════════ */
  function checkoutDecor(view) {
    const S = SH();
    const cfg = (window._co && window._co.payCfg) || (S.state && S.state.payCfg) || null;
    $$('#payOpts .pay-opt').forEach(opt => {
      if ($('.v107-fee', opt)) return;
      const input = $('input', opt);
      const val = input ? input.value : '';
      const label = $('b, .po-name, span', opt);
      if (!label) return;
      let txt = '', ok = false;
      if (val === 'Online') { txt = 'UPI & wallets: no extra fee'; ok = true; }
      else if (val === 'COD') { txt = (cfg && cfg.codFee) ? fmt(cfg.codFee) + ' handling at delivery' : 'cash on delivery'; }
      else if (val === 'Part') { txt = 'part now, part on delivery — no fee'; ok = true; }
      if (txt) { const s = document.createElement('span'); s.className = 'v107-fee' + (ok ? ' ok' : ''); s.textContent = txt; label.appendChild(s); }
    });
    const lockBox = $('#rateLockBox');
    if (lockBox && !$('.v107-lock-hint', lockBox)) {
      const h = document.createElement('p');
      h.className = 'v107-lock-hint';
      h.innerHTML = 'Your rate is locked automatically for <b>20 minutes</b> and survives a page refresh. If it lapses, prices return to the live market and the lock re-arms.';
      lockBox.appendChild(h);
    }
  }

  /* ═══ 8 · GST BLOCK ON THE INVOICE ═════════════════════════════════════ */
  function invoiceGST(view, q, id) {
    const S = SH();
    if (!S.api || !id || $('#v107gst', view)) return;
    S.api('/api/orders/' + encodeURIComponent(id)).then(res => {
      const o = (res && res.order) || res;
      if (!o || !o.id || !$('#view').contains(view)) return;
      const set = (S.state && S.state.settings) || {};
      const items = o.items || [];
      const HSN = { Gold: '7113 11', Silver: '7113 19', Diamond: '7102 39', Platinum: '7113 19' };
      const gst = o.gstAmount != null ? o.gstAmount : Math.round((o.total || 0) / 1.03 * 0.03);
      const box = document.createElement('div');
      box.id = 'v107gst';
      box.className = 'v107-gst';
      box.innerHTML = `
        <h3 style="margin:0 0 6px">Tax invoice details</h3>
        <table>
          <tr><td>Supplier GSTIN</td><td>${esc(set.gstin || '—')}</td></tr>
          <tr><td>Place of supply</td><td>${esc(o.state || o.deliveryState || 'Rajasthan (IN-RJ)')} · India</td></tr>
          <tr><td>HSN (jewellery)</td><td class="hsn">${items.map(i => HSN[i.metal] || '7113 11').filter((v, i2, a) => a.indexOf(v) === i2).join(', ') || '7113 11'}</td></tr>
          <tr><td>Taxable value</td><td>${fmt(Math.round((o.total || 0) - gst))}</td></tr>
          <tr><td>CGST 1.5% + SGST 1.5%</td><td>${fmt(gst)}</td></tr>
          <tr><td>Invoice value</td><td><b>${fmt(o.total || 0)}</b></td></tr>
          <tr><td>Invoice no.</td><td class="hsn">${esc(o.invoiceNo || o.id)}</td></tr>
        </table>
        <p class="v107-lock-hint">Composition-dealers and export orders are invoiced separately from the counter. Need a duplicate GST invoice? WhatsApp <b>+91 89050 05921</b> with this order number.</p>`;
      view.appendChild(box);
    }).catch(() => {});
  }

  /* ═══ 9 · HONEST CODE-DELIVERY LINE ON THE PASSPORT ═════════════════════ */
  let deliveryInfo = null;
  function otpChannelLine() {
    const S = SH();
    const load = () => {
      if (!S.api) return;
      S.api('/api/auth/delivery').then(d => { deliveryInfo = d; paint(); }).catch(() => {});
    };
    const paint = () => {
      if (!deliveryInfo) return;
      const text = deliveryInfo.channel === 'sms'
        ? 'Codes arrive by <b>SMS</b> from SHIVAA. Never share them — we will never call to ask.'
        : 'Codes currently arrive by <b>email</b> (the SMS gateway is not configured on this server). Check spam if it does not land in 2 minutes.';
      /* one line per visible passport step: the phone-entry step and the
         OTP step each get their own host, marked so we never duplicate */
      const hosts = [];
      const phoneForm = $('#shvStartForm');            // live passport: phone step
      if (phoneForm) hosts.push(phoneForm);
      const otp = $('#shvOtp');                        // live passport: code step
      if (otp && otp.parentElement) hosts.push(otp.parentElement);
      const sheetBody = $('.shv-body');                // fallback: whatever step is live
      if (sheetBody && !phoneForm && !otp) hosts.push(sheetBody);
      hosts.forEach(host => {
        if (!host || host.__v107chan) return;
        host.__v107chan = 1;
        const line = document.createElement('span');
        line.className = 'v107-chan' + (deliveryInfo.channel === 'email' ? ' warn' : '');
        line.innerHTML = text;
        host.appendChild(line);
      });
    };
    new MutationObserver(() => setTimeout(paint, 40)).observe(document.body, { childList: true, subtree: true });
    load();
  }

  /* ═══ 10 · PWA UPDATE BAR + OFFLINE BANNER ══════════════════════════════ */
  function pwaUpdateBar() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data && e.data.type === 'SW_ACTIVATED' && sessionStorage.getItem('shv_v107_upd') === 'pending') {
        sessionStorage.removeItem('shv_v107_upd');
      }
    });
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      const show = () => {
        if ($('#v107Upd') || sessionStorage.getItem('shv_v107_upd_dismissed')) return;
        const bar = document.createElement('div');
        bar.id = 'v107Upd';
        bar.innerHTML = `<span>✦ A fresher Shivaa is ready.</span><button id="v107UpdGo">Update now</button><button class="x" id="v107UpdX" aria-label="Dismiss">×</button>`;
        document.body.appendChild(bar);
        $('#v107UpdGo').onclick = () => {
          sessionStorage.setItem('shv_v107_upd', 'pending');
          reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => location.reload(), 400);
        };
        $('#v107UpdX').onclick = () => { sessionStorage.setItem('shv_v107_upd_dismissed', '1'); bar.remove(); };
      };
      if (reg.waiting) show();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) show(); });
      });
    }).catch(() => {});
  }
  function offlineBanner() {
    const show = () => {
      if ($('#v107Offline')) return;
      const bar = document.createElement('div');
      bar.id = 'v107Offline';
      bar.innerHTML = `<span>📴 Offline — showing what is saved on this device.</span>`;
      document.body.appendChild(bar);
    };
    const hide = () => { const b = $('#v107Offline'); if (b) b.remove(); };
    window.addEventListener('offline', show);
    window.addEventListener('online', hide);
    if (!navigator.onLine) show();
  }

  /* ═══ 11 · PATHNAME → HASH NORMALISER ═══════════════════════════════════ */
  function pathNormalizer() {
    const p = location.pathname;
    if (p === '/' || p === '/index.html' || /\.[a-z0-9]{2,5}$/i.test(p)) return;   // real files stay files
    if (p.indexOf('/api/') === 0 || p.indexOf('/uploads/') === 0 || p.indexOf('/data/') === 0) return;
    const route = p.replace(/^\/+/, '').replace(/\/+$/, '');
    if (location.hash && location.hash !== '#/') return;                            // hash wins when present
    const known = (SH().routes || {});
    const key = route.split('/')[0];
    if (known[key] || key === 'product' || key === 'shop' || key === 'page') {
      location.replace('/#' + (p === '/' ? '/' : p) + location.search);
    }
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function init() {
    safe('ticker', footerTicker);
    safe('glow', tabGlow);
    safe('press', pressFeedback);
    safe('hidden', hiddenPause);
    safe('qv', qvGuard);
    safe('dds', designDetail);
    safe('sizeguide', sizeGuideRoute);
    safe('otp', otpChannelLine);
    safe('pwa', pwaUpdateBar);
    safe('offline', offlineBanner);
    safe('path', pathNormalizer);
    wrapRoute('order', orderTimeline);
    wrapRoute('invoice', invoiceGST);
    wrapRoute('checkout', checkoutDecor);
    wrapRoute('account', refundTracker);
    /* v107 lineage port (from the v106 prototype, additive only): the HUID
       page keeps the live v104 per-piece panel; we append the honesty FAQ
       accordion + privacy/source notes that prototype authored. */
    wrapRoute('hallmark', view => {
      if (!view || $('#v107hmFaq', view)) return;
      const box = document.createElement('div');
      box.id = 'v107hmFaq';
      box.className = 'container';
      box.style.margin = '26px auto 0';
      box.innerHTML = `
        <details class="acc"><summary>Does an accepted format mean a genuine hallmark?</summary><div class="acc-body">No. Any six letters or numbers can pass a format check. Only the official lookup can show the BIS record, and you still need to compare its details with your actual piece. This website does not assay metal or issue a certificate.</div></details>
        <details class="acc"><summary>What if there is no HUID, no result or a mismatch?</summary><div class="acc-body">A missing code on this website does not prove a piece is unhallmarked or counterfeit. If a stamp is unreadable, BIS Care returns no result, or details differ, recheck the code and ask BIS or the jeweller for clarification. A service outage is not a “not found” result.</div></details>
        <details class="acc"><summary>What about pairs, detachable parts or silver?</summary><div class="acc-body">Do not reuse a design’s code across multiple pieces or parts. Check the stamp on each actual article and follow the current BIS guidance for its metal and hallmarking scheme. Do not substitute an older hallmark identifier for a six-character HUID.</div></details>
        <p class="hm-source">This tool does not save lookup history or add your code to a URL. The format check sends it to Shivaa’s server, not to BIS. Only “Copy” writes it to your clipboard. · Guidance: <a href="https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/?lang=en" target="_blank" rel="noopener noreferrer">BIS hallmarking FAQs ↗</a> · <a href="https://www.bis.gov.in/bis-apps/?lang=en" target="_blank" rel="noopener noreferrer">BIS Care information ↗</a></p>`;
      view.appendChild(box);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
