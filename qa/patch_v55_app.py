# -*- coding: utf-8 -*-
"""v55 app.js batch: global rate pill, funnel events, ?ref= capture, abandoned-cart
capture + welcome-back bar, shop ready badges, product EMI box, four new pages
(bundle / giftcard / refer / video-consult / pickup), finale counter + stream +
winner, register sends referral code."""
p = 'cms/js/app.js'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

# 1) global module expansion
rep("  const bbRoute = () => document.body.classList.toggle('pdp-on', (location.hash || '').startsWith('#/product/'));\n  addEventListener('hashchange', bbRoute); bbRoute();",
"""  const bbRoute = () => document.body.classList.toggle('pdp-on', (location.hash || '').startsWith('#/product/'));
  addEventListener('hashchange', bbRoute); bbRoute();

  /* v55: live-rate pill on every page */
  const pill = document.createElement('a'); pill.id = 'ratePill'; pill.href = '#/rates';
  pill.setAttribute('aria-label', 'Today’s gold rate — open the rates page');
  document.body.appendChild(pill);
  const tickPill = () => fetch('/api/rates').then(r => r.json()).then(r => {
    if (r && r.gold22) pill.innerHTML = '<b>22K</b> ₹' + Math.round(r.gold22).toLocaleString('en-IN') + '/g <span>↻</span>';
  }).catch(() => {});
  tickPill(); setInterval(tickPill, 300000);

  /* v55: referral capture — shivaa.in/?ref=SH12AB3 */
  try {
    const rp = new URLSearchParams(location.search).get('ref');
    if (/^SH[A-Z0-9]{5}$/i.test(rp || '')) localStorage.setItem('sh_ref', rp.toUpperCase());
  } catch (e) {}

  /* v55: funnel events (view / cart / checkout) */
  const sendEv = (ev, pp) => { try { fetch('/api/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ev, p: pp || '' }), keepalive: true }); } catch (e) {} };
  addEventListener('hashchange', () => {
    const h = location.hash || '';
    if (h.startsWith('#/product/')) sendEv('view', h.slice(2, 62));
    else if (h.startsWith('#/cart')) { sendEv('cart'); try { localStorage.removeItem('sh_abandoned'); } catch (e) {} }
    else if (h.startsWith('#/checkout')) sendEv('checkout');
  });

  /* v55: abandoned-cart capture (once per 6h, only outside checkout) */
  addEventListener('pagehide', () => {
    try {
      const cart = (window.Shivaa && state.cart) || [];
      if (!cart.length || (location.hash || '').startsWith('#/checkout')) return;
      const last = parseInt(localStorage.getItem('sh_abSent') || '0', 10);
      if (Date.now() - last < 6 * 3600e3) return;
      localStorage.setItem('sh_abSent', String(Date.now()));
      localStorage.setItem('sh_abandoned', '1');
      const items = cart.map(c => { const pr = state.productsCache.find(x => x.id === c.id); return { n: (pr && pr.name) || 'A Shivaa piece', q: c.qty || 1 }; });
      const total = cart.reduce((a, c) => { const pr = state.productsCache.find(x => x.id === c.id); return a + (pr && typeof price === 'function' ? price(pr) * (c.qty || 1) : 0); }, 0);
      fetch('/api/carts/abandon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ items, total, phone: (state.user && state.user.phone) || '' }) });
    } catch (e) {}
  });

  /* v55: welcome-back bar when a saved cart is waiting */
  setTimeout(() => {
    try {
      if (localStorage.getItem('sh_abandoned') && state.cart.length && !document.getElementById('backBar')) {
        const bar = document.createElement('div'); bar.id = 'backBar';
        bar.innerHTML = '<span>✦ Your cart is waiting — ' + state.cart.reduce((a, i) => a + (i.qty || 1), 0) + ' piece(s)</span><div><a class="btn btn-primary btn-sm" href="#/cart">Resume</a><button class="btn btn-ghost btn-sm" id="backBarX">✕</button></div>';
        document.body.appendChild(bar);
        document.getElementById('backBarX').onclick = () => bar.remove();
      }
    } catch (e) {}
  }, 2200);

  /* v55: ready-to-ship badges in the shop grid */
  addEventListener('hashchange', () => {
    if (!(location.hash || '').startsWith('#/shop')) return;
    setTimeout(() => $$('.p-card').forEach(card => {
      const pr = state.productsCache.find(x => x.id === card.dataset.pid);
      if (pr && (pr.stock | 0) >= 10 && !card.querySelector('.ready-badge'))
        card.insertAdjacentHTML('afterbegin', '<span class="ready-badge">✦ Ready · ships 48h</span>');
    }), 420);
  });""", 'global v55 module')

# 2) product EMI box (inside the v54 product block)
rep("  $('#bbBuy', bb).onclick = () => window.Shivaa.pdBuy(p.id);",
"""  $('#bbBuy', bb).onclick = () => window.Shivaa.pdBuy(p.id);
  /* v55: EMI calculator under the price breakdown trigger */
  const _P = (p.price && p.price.total) || 0;
  if (_P > 0 && !$('#emiBox', view)) {
    const emi = document.createElement('details'); emi.id = 'emiBox'; emi.className = 'emi-box';
    emi.innerHTML = '<summary>💳 EMI options</summary><div class="emi-in">' +
      '<div class="sum-row"><span>3 months · no-cost</span><b>₹' + Math.round(_P / 3).toLocaleString('en-IN') + '/mo</b></div>' +
      '<div class="sum-row"><span>6 months · standard</span><b>₹' + Math.round(_P * 1.045 / 6).toLocaleString('en-IN') + '/mo</b></div>' +
      '<small>Cards & UPI autopay · the exact figure prints on your bill</small></div>';
    const brk = $('#brkBtn', view); if (brk) brk.insertAdjacentElement('beforebegin', emi);
  }""", 'EMI box')

# 3) new pages before pages.home
rep("pages.home = async (view) => {",
"""/* ─────────── v55 pages: bridal bundle · gift cards · refer · video consult · dead-stock pickup ─────────── */
const v55Shell = (crumb, title, ital, intro, bodyHtml) => `
  <section class="page-hero"><div class="dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="container"><div class="crumbs"><a href="#/">Home</a> / ${crumb}</div><h1>${title} <em class="disp-italic">${ital}</em></h1>
  <p>${intro}</p></div></section>
  <div class="container" style="padding:40px 0 60px;max-width:760px">${bodyHtml}</div>`;

pages.bundle = async (view) => {
  view.innerHTML = v55Shell('Bridal Bundle', 'Build her complete ', 'set', 'Pick the pieces of the full bridal look — our family prices the bundle with a special making-charge concession and holds everything together.',
    `<div class="adm-card"><form id="bundleForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      ${[['Rani haar / necklace', 'necklace'], ['Jhumka / chandbali', 'earrings'], ['Bangles or kada', 'bangles'], ['Mangalsutra', 'mangalsutra'], ['Rings (bride + groom)', 'rings'], ['Nath / hathphool', 'extras']].map(x => `<label class="fld" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="pick" value="${x[0]}" style="accent-color:var(--gold);width:17px;height:17px"> ${x[0]}</label>`).join('')}
      <div class="fld full"><label>Approximate budget</label><input name="budget" placeholder="e.g. ₹2.5 lakh"></div>
      <div class="fld full"><label>Wedding date (if fixed)</label><input name="date" type="date"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Send to the Shivaa family on WhatsApp →</button>
    </form><p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">Bundles are quoted personally with the bundle concession on making charges — never on metal, which always stays at the live rate.</p></div>`);
  $('#bundleForm', view).onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const picks = f.getAll('pick');
    if (!picks.length) { toast('Pick at least one piece ✦', 'err'); return; }
    waOpen('Namaste Shivaa ✦ — I want to build a bridal bundle:\\n· ' + picks.join('\\n· ') + (f.get('budget') ? '\\nBudget: ' + f.get('budget') : '') + (f.get('date') ? '\\nWedding date: ' + f.get('date') : ''));
  };
};

pages.giftcard = async (view) => {
  view.innerHTML = v55Shell('Gift Cards', 'Gift gold, ', 'digitally', 'A Shivaa gift card is redeemed like cash at checkout — online or at the Jayal counter. We issue it on WhatsApp within the hour after payment.',
    `<div class="adm-card"><form id="gcForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Amount</label><select name="amt">${[5000, 11000, 21000, 51000].map(a => `<option value="${a}">₹${a.toLocaleString('en-IN')}</option>`).join('')}<option value="custom">Custom</option></select></div>
      <div class="fld"><label>Custom amount ₹</label><input name="custom" type="number" min="1000" placeholder="only if Custom"></div>
      <div class="fld"><label>For (name)</label><input name="for" placeholder="e.g. Priya, on her wedding"></div>
      <div class="fld"><label>From (your name)</label><input name="from"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Request on WhatsApp →</button>
    </form><p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">You pay by UPI on the WhatsApp chat; the card code arrives there — usable with coupon entry at checkout. Code BRIDALSET (10% off making charges on 2+ bridal pieces) is active right now.</p></div>`);
  $('#gcForm', view).onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const amt = f.get('amt') === 'custom' ? ('₹' + (f.get('custom') || '?')) : '₹' + parseInt(f.get('amt'), 10).toLocaleString('en-IN');
    waOpen('Namaste Shivaa ✦ — gift card request\\nAmount: ' + amt + (f.get('for') ? '\\nFor: ' + f.get('for') : '') + (f.get('from') ? '\\nFrom: ' + f.get('from') : ''));
  };
};

pages.refer = async (view) => {
  const code = (state.user && state.user.referralCode) || null;
  view.innerHTML = v55Shell('Refer & Earn', 'Share Shivaa, ', 'both win', 'Your friend signs up with your code; after their first order completes, we credit a thank-you coupon to you both — confirmed personally by the family.',
    `<div class="adm-card" style="text-align:center">${code ? `
      <p style="font-size:13px;color:var(--ink-3)">Your referral code</p>
      <div style="font-family:var(--ff-disp);font-size:38px;letter-spacing:.14em;color:var(--maroon-deep);margin:6px 0">${esc(code)}</div>
      <p style="font-size:13.5px">Share link: <b>shivaa.in/?ref=${esc(code)}</b></p>
      <button class="btn btn-gold btn-sm" id="refWa" style="margin-top:12px">Share on WhatsApp ✦</button>` :
      `<p>Sign in (or create your account) to get your personal referral code — it appears right here.</p>
       <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="Shivaa.openLogin ? Shivaa.openLogin() : (location.hash='#/account')">Sign in</button>`}
    </div>`);
  const b = $('#refWa', view);
  if (b) b.onclick = () => waOpen('Shivaa Jewellers — BIS hallmarked, live-rate pricing, insured delivery ✦ Use my code ' + code + ' when you sign up: shivaa.in/?ref=' + code);
};

pages.videoconsult = async (view) => {
  view.innerHTML = v55Shell('Video Consultation', 'See it live, ', 'from home', 'A family member walks you through real pieces on WhatsApp video — weights, hallmark, finish — from the Jayal counter. Pick a slot.',
    `<div class="adm-card"><form id="vcForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Your name</label><input name="name" required></div>
      <div class="fld"><label>Phone (WhatsApp)</label><input name="phone" required placeholder="10-digit"></div>
      <div class="fld"><label>Preferred day</label><input name="day" type="date" required></div>
      <div class="fld"><label>Preferred slot</label><select name="slot">${['10:00–12:00', '12:00–14:00', '16:00–18:00', '18:00–20:30'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="fld full"><label>What would you like to see?</label><input name="details" placeholder="e.g. bridal rani haar + jhumka, budget ₹1.5L"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Book the consultation →</button>
    </form></div>`);
  $('#vcForm', view).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ type: 'video-consult', name: f.get('name'), phone: f.get('phone'), details: (f.get('day') + ' · ' + f.get('slot') + ' — ' + (f.get('details') || '')).slice(0, 200) }) });
      toast('Booked ✦ we’ll confirm your slot on WhatsApp');
    } catch (err) { toast(err.message || 'Could not book', 'err'); }
  };
};

pages.pickup = async (view) => {
  view.innerHTML = v55Shell('Dead-Stock Pickup', 'Old stock in, ', 'fine metal out', 'Book a pickup for dead stock — we assay at your counter or ours, and settle in fine gold grams at the live rate, minus nothing hidden.',
    `<div class="adm-card"><form id="puForm" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fld"><label>Firm / name</label><input name="name" required></div>
      <div class="fld"><label>Phone</label><input name="phone" required placeholder="10-digit"></div>
      <div class="fld"><label>City</label><input name="city"></div>
      <div class="fld"><label>Approx. weight</label><input name="wt" placeholder="e.g. 850 g 22K"></div>
      <div class="fld full"><label>Notes</label><input name="details" placeholder="pickup date preference, item types…"></div>
      <button class="btn btn-gold btn-block" style="grid-column:1/-1">Book the pickup →</button>
    </form></div>`);
  $('#puForm', view).onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ type: 'deadstock-pickup', name: f.get('name'), phone: f.get('phone'), details: ((f.get('city') ? f.get('city') + ' · ' : '') + (f.get('wt') || '') + ' · ' + (f.get('details') || '')).slice(0, 200) }) });
      toast('Pickup booked ✦ the desk will call to confirm');
    } catch (err) { toast(err.message || 'Could not book', 'err'); }
  };
};

pages.home = async (view) => {""", 'five new pages')

# 4) finale hook: counter + stream + winner
rep("  fqSyncZones();\n}\nwindow.Shivaa.fqSyncZones = fqSyncZones;",
"""  fqSyncZones();
  /* v55: public entry counter · draw-night stream button · winner announcement */
  (async () => {
    try {
      const c = await api('/api/finale/count');
      const anchor = $('#prizeWorth');
      if (anchor && (c.count | 0) > 0 && !$('#entryCount')) {
        const chip = document.createElement('span'); chip.className = 'fp-chip'; chip.id = 'entryCount';
        chip.innerHTML = '✦ <b>' + (c.count | 0).toLocaleString('en-IN') + '</b> entries so far · every route, equal odds';
        anchor.insertAdjacentElement('afterend', chip);
      }
    } catch (e) {}
    try {
      const st = await api('/api/settings');
      const drawNight = new Date().toDateString() === new Date(2026, 10, 11).toDateString();
      if (st.drawStreamUrl && drawNight && !$('#drawStreamBtn')) {
        const b = document.createElement('a'); b.id = 'drawStreamBtn'; b.className = 'btn btn-gold';
        b.target = '_blank'; b.rel = 'noopener'; b.href = st.drawStreamUrl;
        b.textContent = '▶ Watch the live draw now';
        b.style.cssText = 'display:block;margin:18px auto;width:max-content';
        const hero = $('#view .fh-hero') || $('#view');
        hero.insertAdjacentElement('afterend', b);
      }
      if (Date.now() > FINALE.drawAt && st.winnerNote && !$('#winnerNote')) {
        const w = document.createElement('div'); w.id = 'winnerNote';
        w.style.cssText = 'max-width:640px;margin:22px auto;padding:18px 22px;border:1px solid var(--gold-soft);border-radius:16px;background:var(--gold-faint)';
        w.innerHTML = '<h3 style="margin-bottom:6px">🏆 Winner announced</h3><p style="font-size:14.5px">' + esc(st.winnerNote) + '</p>';
        $('#view').appendChild(w);
      }
    } catch (e) {}
  })();
}
window.Shivaa.fqSyncZones = fqSyncZones;""", 'finale v55 block')

# 5) register sends the referral code
rep("password: $('#rgPass').value }) });",
    "password: $('#rgPass').value, ref: localStorage.getItem('sh_ref') || '' }) });", 'register ref param')

open(p, 'w', encoding='utf-8').write(s)
print('app.js v55 batch applied:', s != o)
