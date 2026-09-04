/* ═══════════════════════════════════════════════════════════
   SHIVAA admin.js — Admin Dashboard + B2B Partner Portal
   ═══════════════════════════════════════════════════════════ */
'use strict';
(function () {
const { api, state, toast, fmt, esc, openModal, closeModal, token } = window.Shivaa;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const CATS = window.Shivaa ? {
  rings: 'Rings', necklaces: 'Necklaces', earrings: 'Earrings', bangles: 'Bangles & Kadas', bracelets: 'Bracelets',
  pendants: 'Pendants & Chains', mangalsutra: 'Mangalsutra', nosepins: 'Nose Pins', silver: 'Silver 925',
} : {};
const IMG_FILES = ['ring-floral.jpg','ring-kundan.jpg','ring-signet.jpg','ring-couple.jpg','necklace-rani.jpg','necklace-choker.jpg','necklace-satlada.jpg','earrings-jhumka.jpg','earrings-chandbali.jpg','earrings-studs.jpg','earrings-drops.jpg','bangle-kada.jpg','bangle-pair.jpg','bracelet-tennis.jpg','bracelet-charm.jpg','pendant-om.jpg','pendant-infinity.jpg','chain-gold.jpg','mangalsutra-trad.jpg','mangalsutra-modern.jpg','nosepin.jpg','silver-anklet.jpg','silver-chain.jpg','silver-kada.jpg'];

/* ════════════════ ADMIN ════════════════ */
async function renderAdmin(view, q) {
  const tab = q.get('tab') || 'overview';
  if (!state.user || state.user.role !== 'admin') {
    view.innerHTML = `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:30px">
      <div class="adm-card" style="max-width:430px;width:100%">
        <div class="center"><img src="/images/logo.png" style="height:44px;margin:0 auto 12px"><h3 style="margin-bottom:4px">Admin Dashboard</h3><p style="font-size:13px;color:var(--ink-3)">Authorised staff only</p></div>
        <form class="form-grid" style="grid-template-columns:1fr;margin-top:16px" onsubmit="ShivaaAdmin.login(event)">
          <div class="fld"><label>Email</label><input name="email" type="email" autocomplete="username" required></div>
          <div class="fld"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block">Sign in</button>
        </form>
      </div></div>`;
    return;
  }
  let stats = {};
  if (tab === 'overview') { try { stats = await api('/api/admin/stats'); } catch (e) {} }
  let partnersData = { partners: [] };
  if (tab === 'partners') { try { partnersData = await api('/api/partners'); } catch (e) {} }
  let orders = [];
  if (tab === 'orders') { try { orders = (await api('/api/orders')).orders; } catch (e) {} }
  let catalogs = [];
  if (tab === 'catalogs') { try { catalogs = (await api('/api/catalogs')).catalogs; } catch (e) {} }
  let users = [];
  if (tab === 'customers') { try { users = (await api('/api/admin/users')).users; } catch (e) {} }
  let leads = { requests: [] };
  if (tab === 'leads') { try { leads = await api('/api/services'); } catch (e) {} }
  let coupons = [];
  if (tab === 'coupons') { try { coupons = (await api('/api/coupons')).coupons; } catch (e) {} }
  let reviews = [];
  // Always load reviews for the pending-count badge on the nav; tab==='reviews' uses the full list.
  try { reviews = (await api('/api/reviews?status=all')).reviews || []; } catch (e) {}
  let abandoned = [];
  if (tab === 'carts') { try { abandoned = (await api('/api/cart-abandon')).carts || []; } catch (e) {} }
  window.ShivaaAdmin._abandoned = abandoned;
  const P = partnersData.partners || [];
  const pendingPartners = P.filter(x => x.status === 'pending').length;
  const newLeads = (leads.requests || []).length;

  view.innerHTML = `
  <div class="admin-shell">
    <aside class="adm-side">
      <div class="adm-logo"><img src="/images/logo.png" alt=""><div><b style="font-family:var(--ff-disp);font-size:17px">Shivaa</b><br><small style="font-size:10px;letter-spacing:.2em;opacity:.7">CONTROL ROOM</small></div></div>
      <nav class="adm-nav">
        ${[['overview','◈','Overview'],['products','✦','Products'],['orders','▦','Orders'],['bullion','🥇','Bullion Rates'],['weights','⚖','Ring Weights'],['rates','↻','Live Rates'],['catalogs','❒','Catalogues'],['partners','◈','B2B Partners'],['customers','♡','Customers'],['leads','✉','Leads'],['coupons','%','Coupons'],['reviews','★','Reviews'],['carts','🛒','Cart Recovery'],['pages','📄','Pages'],['settings','⚙','Settings']].map(n => `<a href="#/admin?tab=${n[0]}" class="${tab === n[0] ? 'on' : ''}">${n[1]} ${n[2]}${n[0] === 'partners' && pendingPartners ? ` <span class="cnt">${pendingPartners}</span>` : ''}${n[0] === 'leads' && newLeads ? ` <span class="cnt">${newLeads}</span>` : ''}${n[0] === 'reviews' && reviews.filter(r => r.status === 'pending').length ? ` <span class="cnt">${reviews.filter(r => r.status === 'pending').length}</span>` : ''}</a>`).join('')}
        <a href="#/" style="margin-top:14px">← Back to store</a>
      </nav>
    </aside>
    <main class="adm-main">
      <div class="adm-head"><h2>${({overview:'Overview',products:'Products',orders:'Orders',bullion:'Bullion Rates',weights:'Ring Weights',rates:'Live Rates',mc:'Making Charges',catalogs:'Catalogues',partners:'B2B Partners',customers:'Customers',leads:'Leads',coupons:'Coupons',reviews:'Review Moderation',carts:'Cart Recovery',pages:'Pages',settings:'Settings'})[tab] || tab}</h2>
        <div style="display:flex;gap:10px;align-items:center"><span class="src-badge ${state.rates?.source === 'live' ? 'src-live' : 'src-sim'}"><span class="live-dot"></span>${esc(state.rates?.source || '')} · Gold 22K ${fmt(state.rates?.gold22 || 0)}/g</span></div></div>
      <div id="admBody"></div>
    </main>
  </div>`;
  const body = $('#admBody');

  /* ── OVERVIEW ── */
  if (tab === 'overview') {
    const days = Object.entries(stats.byDay || {}).slice(-14);
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><small>Revenue</small><b>${fmt(stats.revenue || 0)}</b><span>${stats.orders || 0} orders</span></div>
        <div class="stat"><small>Avg order value</small><b>${fmt(stats.aov || 0)}</b><span>incl. GST</span></div>
        <div class="stat"><small>Customers</small><b>${stats.customers || 0}</b><span>${stats.newsletter || 0} newsletter</span></div>
        <div class="stat"><small>B2B partners</small><b>${stats.partners || 0}</b><span style="${stats.pendingPartners ? 'color:var(--warn)' : ''}">${stats.pendingPartners || 0} pending</span></div>
      </div>
      <div class="adm-card"><h3>Daily revenue (last ${days.length || 0} days)</h3><canvas id="admChart"></canvas></div>
      <div class="grid2">
        <div class="adm-card"><h3>Low stock <a class="btn btn-ghost btn-sm" href="#/admin?tab=products">Manage →</a></h3>
          ${stats.lowStock && stats.lowStock.length ? `<div style="display:grid;gap:8px">${stats.lowStock.map(l => `<div class="sum-row"><span>${esc(l.name)}</span><b style="color:${l.stock === 0 ? 'var(--bad)' : 'var(--warn)'}">${l.stock} left</b></div>`).join('')}</div>` : '<p style="color:var(--ink-3);font-size:13.5px">All pieces healthy (stock > 3).</p>'}</div>
        <div class="adm-card"><h3>Pending service requests <a class="btn btn-ghost btn-sm" href="#/admin?tab=leads">Open →</a></h3>
          <p style="font-size:42px;font-family:var(--ff-disp);color:var(--maroon)">${stats.serviceRequests || 0}</p><span style="font-size:13px;color:var(--ink-3)">bespoke / repair / appointments awaiting first response</span></div>
      </div>`;
    drawBarChart($('#admChart'), days);
  }

  if (tab === 'products') {
    body.innerHTML = `
      <div class="adm-card"><h3>${state.productsCache.length} products <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.editProduct()">+ Add product</button></h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th></th><th>Name</th><th>Category</th><th>Metal</th><th class="num">Weight</th><th>Making</th><th class="num">Stock</th><th class="num">Price (live)</th><th></th></tr></thead>
          <tbody>${state.productsCache.map(p => `<tr>
            <td><img src="${p.images[0]}" alt=""></td>
            <td><b>${esc(p.name)}</b><br><small style="color:var(--ink-3)">${p.sku} · ★${p.rating}</small></td>
            <td>${CATS[p.category] || p.category}</td>
            <td>${p.metal === 'Silver' ? 'Silver 925' : p.purity}</td>
            <td class="num">${p.weightG} g</td>
            <td>${p.mcScheme === 'percent' ? p.mcValue + '%' : p.mcScheme === 'perGram' ? '₹' + p.mcValue + '/g' : 'flat ' + fmt(p.mcValue)}</td>
            <td class="num"><b style="color:${p.stock <= 3 ? 'var(--warn)' : 'inherit'}">${p.stock}</b></td>
            <td class="num"><b>${fmt(window.Shivaa.price(p).total)}</b></td>
            <td style="white-space:nowrap"><button class="icon-e" onclick="ShivaaAdmin.editProduct('${p.id}')">✎</button> <button class="icon-x" onclick="ShivaaAdmin.delProduct('${p.id}')">✕</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
  }

  /* ── ORDERS ── */
  if (tab === 'orders') {
    body.innerHTML = `<div class="adm-card"><h3>${orders.length} orders</h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
        <tbody>${orders.map(o => `<tr>
          <td><b>${o.id}</b><br><small style="color:var(--ink-3)">${new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></td>
          <td>${esc(o.userName)}</td>
          <td>${o.items.reduce((a, i) => a + i.qty, 0)}</td>
          <td class="num"><b>${fmt(o.total)}</b></td>
          <td>${esc(o.paymentMethod)}${o.paymentMethod === 'COD' ? ' <small style="color:var(--warn)">(pending)</small>' : ' ✓'}</td>
          <td><select onchange="ShivaaAdmin.setStatus('${o.id}', this.value)">
            ${['Placed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td><button class="icon-e" onclick="Shivaa.orderDetail('${o.id}')">👁</button></td>
        </tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  /* ── RING WEIGHTS quick-entry desk ── */
  if (tab === 'weights') {
    const rings = state.productsCache.filter(p => p.id.startsWith('p_ringpdf_'));
    const assumed = rings.filter(p => p.weightAssumed).length;
    body.innerHTML = `
    <div class="adm-card"><h3>⚖ Ring Weights — read from the tags
      <span style="font-size:12px;color:var(--ink-3);font-weight:400">${assumed} assumed · type the real tag weight & press Enter</span></h3>
      <div class="wt-grid">
        ${rings.map(p => `<div class="wt-card ${p.weightAssumed ? 'assumed' : ''}">
          <img src="${p.images[0]}" loading="lazy" alt="${p.sku}">
          <div class="wt-tx"><b>${p.sku}</b>
            <input type="number" step="0.001" min="0.5" value="${p.weightG}" data-id="${p.id}"
              placeholder="tag weight (g)" onchange="ShivaaAdmin.setWt('${p.id}', this.value)">
            <small class="wt-flag">${p.weightAssumed ? '⚠ assumed — verify' : '✓ set'}</small>
          </div>
        </div>`).join('')}
      </div></div>`;
  }

  /* ── BULLION ── */
  if (tab === 'bullion') {
    body.innerHTML = `<div class="adm-card"><h3>🥇 Bullion — CASH rates <span style="font-size:12px;color:var(--ink-3);font-weight:400">— RTGS rows auto-compute from the live feed; only CASH rates need you</span></h3>
      <div id="admBullion"><div class="loading-spin"></div></div>
      <p class="partner-note" style="margin-top:12px">Saving instantly notifies every logged-in jeweller portal ("📈 Bullion CASH rates updated"). RTGS (TDS Gold 995, Silver Chorsa/Peti) update automatically every 10 min from the international bullion API — no action needed.</p>
    </div>
    <div class="adm-card"><h3>All bullion orders</h3><div id="admBlOrders"></div></div>`;
    (async () => {
      try {
        const B = await api('/api/bullion');
        const cash = B.rows.filter(r => r.editable);
        const rtgs = B.rows.filter(r => !r.editable);
        document.getElementById('admBullion').innerHTML = `
          <div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>RTGS (auto · live feed)</th><th>Purity</th><th class="num">Buy ₹/g</th><th class="num">Sell ₹/g</th></tr></thead>
          <tbody>${rtgs.map(r => `<tr><td><b>${r.label}</b></td><td>${r.purity}</td><td class="num">${r.buy.toLocaleString('en-IN')}</td><td class="num">${r.sell.toLocaleString('en-IN')}</td></tr>`).join('')}</tbody></table></div>
          <div class="sec-title" style="margin-top:20px">CASH rates — you control these</div>
          <form id="blCashForm" class="form-grid" onsubmit="ShivaaAdmin.saveBullion(event)">
            ${cash.map(r => `<div class="fld full bl-edit-row"><label><b>${r.label}</b> · ${r.purity}</label>
              <div style="display:flex;gap:10px"><input type="number" data-k="${r.key}" data-f="buy" value="${r.buy}" placeholder="Buy ₹/g" style="flex:1"><input type="number" data-k="${r.key}" data-f="sell" value="${r.sell}" placeholder="Sell ₹/g" style="flex:1"></div></div>`).join('')}
            <button class="btn btn-primary btn-block" style="grid-column:1/-1">💾 Save Cash Rates (notifies jewellers)</button>
          </form>`;
        const { orders } = await api('/api/bullion/orders');
        document.getElementById('admBlOrders').innerHTML = orders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Partner</th><th>Side</th><th>Metal</th><th class="num">Qty</th><th class="num">Value</th><th>When</th><th>Status</th></tr></thead><tbody>${orders.map(o => `<tr><td><b>${o.id}</b></td><td>${esc(o.partnerName)}</td><td>${o.side}</td><td>${o.metal.split('—')[0]}</td><td class="num">${o.qty}${o.unit}</td><td class="num"><b>₹${o.amount.toLocaleString('en-IN')}</b></td><td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td><td><select onchange="ShivaaAdmin.blStatus('${o.id}',this.value)">${['New','Confirmed','Delivered','Cancelled'].map(s2 => `<option ${o.status === s2 ? 'selected' : ''}>${s2}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No bullion orders yet.</p>';
      } catch (e) { document.getElementById('admBullion').innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
    })();
  }

  /* ── RATES ── */
  if (tab === 'rates') {
    const R = state.rates;
    body.innerHTML = `
      <div class="stat-grid">
        ${[['Gold 24K', R.gold24, '/g'], ['Gold 22K', R.gold22, '/g'], ['Gold 18K', R.gold18, '/g'], ['Silver 925', R.silver, '/g']]
          .map(c => `<div class="stat"><small>${c[0]}</small><b>${fmt(c[1])}${c[2]}</b><span>per 10g: ${fmt(c[1] * 10)}</span></div>`).join('')}
      </div>
      <div class="adm-card"><h3>Feed control <span class="src-badge ${R.source === 'live' ? 'src-live' : 'src-sim'}"><span class="live-dot"></span>${esc(R.source)}</span></h3>
        <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:14px">Server polls the bullion market every 10 minutes (XAU/XAG USD→INR). "Refresh now" forces an immediate poll; override pins the counter rate (e.g., for in-store boards) until cleared.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.refreshRates()">↻ Refresh now</button>
          <span style="font-size:12px;color:var(--ink-3);align-self:center">Last updated ${new Date(R.t).toLocaleTimeString('en-IN')}</span>
        </div>
        <div class="sec-title" style="margin-top:22px">Manual override</div>
        <form class="form-grid" onsubmit="ShivaaAdmin.setOverride(event)" style="max-width:560px">
          <div class="fld"><label>Gold 24K (₹/g)</label><input type="number" step="0.01" value="${R.gold24}" required></div>
          <div class="fld"><label>Silver (₹/g)</label><input type="number" step="0.01" value="${R.silver}" required></div>
          <div class="fld full" style="display:flex;gap:10px"><button class="btn btn-gold btn-sm">Set override</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.clearOverride()">Clear override</button>
          ${R.override ? '<span style="font-size:12.5px;color:var(--warn);align-self:center">⚠ override is ACTIVE — storefront prices use these values</span>' : ''}</div>
        </form>
      </div>
      <div class="adm-card"><h3>22K gold — recent history</h3><canvas id="admRateChart"></canvas></div>`;
    window.Shivaa._chart && window.Shivaa._chart();
    const cv = $('#admRateChart');
    // reuse the store's chart renderer
    const hist = R.history || [];
    if (cv && hist.length) {
      const x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = cv.parentElement.clientWidth, h = 260;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const data = hist.map(p => p.gold22), pad = { l: 56, r: 20, t: 10, b: 22 };
      const min = Math.min(...data), max = Math.max(...data);
      const X = i => pad.l + i / (data.length - 1) * (w - pad.l - pad.r);
      const Y = v => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
      x.strokeStyle = '#eee3cd'; x.fillStyle = '#8a7d6c'; x.font = '11px Jost';
      for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4, y = Y(v); x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke(); x.fillText(Math.round(v), 8, y + 4); }
      x.beginPath(); data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)));
      x.strokeStyle = '#6e1e2a'; x.lineWidth = 2; x.stroke();
    }
  }

  /* ── MAKING CHARGES (now per-product) ── */
  if (tab === 'mc') {
    body.innerHTML = `<div class="adm-card"><h3>Making charges are set per product</h3>
      <p style="font-size:14px;color:var(--ink-2);line-height:1.8">We no longer fix making charges by category. Every piece carries its own percentage, exactly like the Tanishq model — customers see it only on that product's page.</p>
      <p style="font-size:13.5px;color:var(--ink-3);margin-top:8px">To price a piece: <b>Products → Edit/Add</b> → “MC % of metal value” field. The bullion desk handles partner metal rates separately.</p>
      <a class="btn btn-primary" style="margin-top:14px" href="#/admin?tab=products">Go to Products →</a></div>`;
  }

  /* ── CATALOGS ── */
  if (tab === 'catalogs') {
    body.innerHTML = `
      <div class="adm-card"><h3>Upload catalogue PDF <span style="font-size:12px;color:var(--ink-3);font-weight:400">— rings, earrings, festive specials… appears on the storefront Catalogues page instantly</span></h3>
        <form id="catUpload" class="form-grid">
          <div class="fld"><label>Title *</label><input name="title" required placeholder="e.g. Diwali Collection 2026"></div>
          <div class="fld"><label>Category</label><input name="category" placeholder="Rings / Bridal / Silver…"></div>
          <div class="fld full"><label>Description</label><input name="desc" placeholder="What's inside this catalogue"></div>
          <div class="fld full" style="display:flex;gap:20px;align-items:center"><label style="margin:0"><input type="checkbox" name="featured" style="accent-color:var(--gold)"> Feature on storefront</label></div>
          <div class="fld full">
            <div class="drop-zone" id="dropZone">
              <div style="font-size:34px;margin-bottom:6px">❒</div>
              <b>Drop PDF here or click to browse</b><br><small>PDF catalogues only · up to ~25 MB</small>
              <input type="file" id="catFile" name="file" accept="application/pdf,.pdf" hidden>
            </div>
          </div>
          <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start" type="submit">Upload Catalogue</button>
        </form></div>
      <div class="adm-card"><h3>${catalogs.length} catalogues</h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Title</th><th>Category</th><th class="num">Size</th><th class="num">Downloads</th><th>Added</th><th>Featured</th><th></th></tr></thead>
          <tbody>${catalogs.map(c => `<tr>
            <td><b>${esc(c.title)}</b><br><small style="color:var(--ink-3)">${esc(c.desc || '')}</small></td>
            <td>${esc(c.category)}</td><td class="num">${(c.size / 1048576).toFixed(1)} MB</td><td class="num">${c.downloads}</td>
            <td>${new Date(c.addedAt).toLocaleDateString('en-IN')}</td>
            <td><input type="checkbox" ${c.featured ? 'checked' : ''} onchange="ShivaaAdmin.featCat('${c.id}', this.checked)" style="accent-color:var(--gold)"></td>
            <td style="white-space:nowrap"><a class="icon-e" href="${c.file}" target="_blank" title="view">👁</a> <button class="icon-x" onclick="ShivaaAdmin.delCat('${c.id}')">✕</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
    const dz = $('#dropZone'), fi = $('#catFile');
    dz.onclick = () => fi.click();
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); };
    dz.ondragleave = () => dz.classList.remove('drag');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) fi.files = e.dataTransfer.files; };
    fi.onchange = () => { if (fi.files[0]) dz.querySelector('b').textContent = fi.files[0].name; };
    $('#catUpload').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!fi.files[0]) return toast('Choose a PDF file first', 'err');
      fd.append('file', fi.files[0]);
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Uploading…';
      try {
        const res = await fetch('/api/catalogs', { method: 'POST', headers: token() ? { Authorization: 'Bearer ' + token() } : {}, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        toast('Catalogue published ✦'); renderAdmin($('#view'), new URLSearchParams('tab=catalogs'));
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; btn.textContent = 'Upload Catalogue'; }
    };
  }

  /* ── PARTNERS ── */
  if (tab === 'partners') {
    const P = partnersData.partners || [];
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><small>Total partners</small><b>${P.length}</b></div>
        <div class="stat"><small>Approved</small><b>${P.filter(p => p.status === 'approved').length}</b></div>
        <div class="stat"><small>Pending</small><b>${P.filter(p => p.status === 'pending').length}</b><span>needs review</span></div>
        <div class="stat"><small>Cities</small><b>${new Set(P.map(p => p.city).filter(Boolean)).size}</b></div>
      </div>
      <div class="adm-card"><h3>Partner applications & network</h3>
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Firm</th><th>KYC</th><th>City</th><th>Phone / Email</th><th>Applied</th><th>Status</th><th></th></tr></thead>
          <tbody>${P.map(p => `<tr>
            <td><b>${esc(p.firm)}</b>${p.kyc ? `<br><small style="color:var(--ink-3)">${esc(p.kyc.gstin)}</small>` : ''}</td>
            <td>${p.kyc ? `<span class="pill pm">GST ✓</span><br><span class="pill pm" style="margin-top:4px">OTP ✓</span>` : '<span class="pill pf">no kyc</span>'}</td>
            <td>${esc(p.contactPerson || '—')}</td><td>${esc(p.city || '—')}</td>
            <td>${esc(p.phone)}<br><small style="color:var(--ink-3)">${esc(p.email)}</small></td>
            <td>${new Date(p.appliedAt).toLocaleDateString('en-IN')}</td>
            <td><span class="status-pill ${p.status === 'approved' ? 'st-delivered' : p.status === 'pending' ? 'st-placed' : 'st-cancelled'}">${p.status}</span></td>
            <td style="white-space:nowrap">${p.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.setPartner('${p.id}','approved')">Approve</button> <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.setPartner('${p.id}','rejected')">Reject</button>` : ''}
              <button class="btn btn-ghost btn-sm" data-em="${esc(p.email)}" onclick="ShivaaAdmin.setUserPassword(this)" title="Set a new portal password for this partner">Portal password</button></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`;
  }

  /* ── CUSTOMERS ── */
  if (tab === 'customers') {
    body.innerHTML = `<div class="adm-card"><h3>${users.length} registered users</h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th class="num">Royalty pts</th><th>Joined</th><th></th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td>
          <td><span class="pill ${u.role === 'admin' ? 'pf' : 'pm'}">${u.role}</span></td>
          <td class="num">${u.loyaltyPoints || 0}</td><td>${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
          <td>${(u.role !== 'admin' || (state.user && u.id === state.user.id)) ? `<button class="btn btn-ghost btn-sm" data-uid="${u.id}" data-em="${esc(u.email)}" ${u.role === 'admin' ? 'data-admin="1"' : ''} onclick="ShivaaAdmin.setUserPassword(this)" title="Set a new sign-in password">Password</button>` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  /* ── LEADS ── */
  if (tab === 'leads') {
    const R = leads.requests || [];
    body.innerHTML = `<div class="adm-card"><h3>Service requests (${R.length})</h3>
      ${R.length ? `<div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Type</th><th>Name</th><th>Phone</th><th>Email</th><th>Details</th><th>Budget</th><th>When</th><th>Status</th></tr></thead>
        <tbody>${R.map(r => `<tr>
          <td><span class="pill pm">${r.type}</span></td><td><b>${esc(r.name)}</b></td><td>${esc(r.phone)}</td><td>${esc(r.email || '—')}</td>
          <td style="max-width:280px"><small>${esc(r.details || '')}</small></td><td>${esc(r.budget || '—')}</td>
          <td>${new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
          <td><select onchange="this.dataset.v=this.value" style="border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12.5px">${['new', 'contacted', 'quoted', 'won', 'closed'].map(s => `<option ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        </tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--ink-3)">No service requests yet — they land here from Bespoke & Care, B2B forms and contact page.</p>'}
    </div>`;
  }

  /* ── COUPONS ── */
  if (tab === 'coupons') {
    body.innerHTML = `<div class="adm-card"><h3>Active coupons</h3>
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Code</th><th>Discount</th><th class="num">Min order</th><th>Note</th><th>Active</th></tr></thead>
        <tbody>${coupons.map(c => `<tr>
          <td><b style="letter-spacing:.08em">${esc(c.code)}</b></td>
          <td>${c.type === 'percent' ? c.value + '%' : fmt(c.value)}</td>
          <td class="num">${fmt(c.minOrder)}</td><td>${esc(c.note || '')}</td>
          <td><input type="checkbox" checked style="accent-color:var(--gold)"></td>
        </tr>`).join('')}</tbody></table></div></div>
      <div class="adm-card"><h3>Create coupon</h3>
        <form class="form-grid" onsubmit="ShivaaAdmin.addCoupon(event)" style="max-width:640px">
          <div class="fld"><label>Code</label><input name="code" required placeholder="AKSHAYA3"></div>
          <div class="fld"><label>Type</label><select name="type" id="cpType" class="sortsel" style="width:100%;border-radius:12px"><option value="percent">Percent %</option><option value="flat">Flat ₹</option></select></div>
          <div class="fld"><label>Value</label><input name="value" type="number" required min="1"></div>
          <div class="fld"><label>Min order ₹</label><input name="minOrder" type="number" min="0" value="0"></div>
          <div class="fld full"><label>Note</label><input name="note" placeholder="shown to customers"></div>
          <button class="btn btn-primary btn-sm" style="justify-self:start">Create</button>
        </form></div>`;
  }

  /* ── REVIEW MODERATION (v41) ── */
  if (tab === 'reviews') {
    const filter = q.get('status') || 'all';
    const list = reviews.filter(r => filter === 'all' || (r.status || 'approved') === filter);
    const cnt = s => reviews.filter(r => (r.status || 'approved') === s).length;
    body.innerHTML = `
      <div class="adm-card"><h3>Reviews &amp; moderation
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          ${[['all', 'All (' + reviews.length + ')'], ['pending', 'Pending (' + cnt('pending') + ')'], ['approved', 'Approved (' + cnt('approved') + ')'], ['rejected', 'Rejected (' + cnt('rejected') + ')']]
            .map(f => `<a class="btn btn-sm ${filter === f[0] ? 'btn-primary' : 'btn-ghost'}" href="#/admin?tab=reviews&status=${f[0]}">${f[1]}</a>`).join('')}
        </div></h3>
        <div style="font-size:12.5px;color:var(--ink-3);margin-bottom:12px">Approve to publish on the product page. New submissions enter as <b>Pending</b>; the ✓ Verified buyer badge is auto-set for customers who have completed an order.</div>
        ${list.length ? `<div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Product</th><th>Reviewer</th><th class="num">Rating</th><th>Review</th><th>Photos</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${list.map(r => `<tr>
            <td><small>${esc((state.productsCache.find(p => p.id === r.productId) || {}).name || r.productId)}</small></td>
            <td><b>${esc(r.userName || r.name || '—')}</b>${r.verified ? '<br><span class="verified-badge">✓ Verified buyer</span>' : ''}<br><small style="color:var(--ink-3)">${new Date(r.createdAt).toLocaleDateString('en-IN')}</small></td>
            <td class="num">${'★'.repeat(r.rating)}</td>
            <td style="max-width:300px"><small>${esc(r.text)}</small></td>
            <td>${(r.photos || []).length ? `<div class="rv-photos">${r.photos.map(ph => `<a href="${esc(ph)}" target="_blank"><img src="${esc(ph)}"></a>`).join('')}</div>` : '—'}</td>
            <td><span class="status-pill ${r.status === 'approved' ? 'st-delivered' : r.status === 'rejected' ? 'st-cancelled' : 'st-placed'}">${r.status || 'pending'}</span></td>
            <td style="white-space:nowrap">
              ${(r.status || 'pending') !== 'approved' ? `<button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.moderateReview('${r.id}','approved')">Approve</button>` : ''}
              ${(r.status || 'pending') !== 'rejected' ? `<button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.moderateReview('${r.id}','rejected')">Reject</button>` : ''}
              <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.toggleVerified('${r.id}', ${r.verified ? 'false' : 'true'})">${r.verified ? 'Unmark' : 'Mark ✓'}</button>
              <button class="icon-x" onclick="ShivaaAdmin.delReview('${r.id}')">✕</button>
            </td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No reviews in this view.</p>'}
      </div>`;
  }

  /* ── CART RECOVERY (v41 — abandoned carts) ── */
  if (tab === 'carts') {
    const open = abandoned.filter(c => !c.converted).length;
    const value = abandoned.filter(c => !c.converted).reduce((a, c) => a + (c.subtotal || 0), 0);
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><small>Abandoned carts</small><b>${abandoned.length}</b><span>${open} open</span></div>
        <div class="stat"><small>Recoverable value</small><b>${fmt(value)}</b><span>not yet converted</span></div>
        <div class="stat"><small>Nudged ×1 / ×2</small><b>${abandoned.filter(c => c.nudgeLevel >= 1 && c.nudgeLevel < 2).length} / ${abandoned.filter(c => c.nudgeLevel >= 2).length}</b><span>1h &amp; 24h nudges</span></div>
        <div class="stat"><small>Converted</small><b>${abandoned.filter(c => c.converted).length}</b><span>recovered</span></div>
      </div>
      <div class="adm-card"><h3>Abandoned carts — send the 1h / 24h WhatsApp nudge</h3>
        <div style="font-size:12.5px;color:var(--ink-3);margin-bottom:12px">Triggered when a "Chat to order" shopper added pieces but never converted. The nudge button opens a WhatsApp chat to their number with a saved-cart message and logs the nudge level (1h then 24h). Automated delivery is driven by your cron job calling <code>/api/cart-abandon/:id</code> (see PROJECT-ANALYSIS §13).</div>
        ${abandoned.length ? `<div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Cart</th><th>Customer</th><th>Items</th><th class="num">Subtotal</th><th>Age</th><th>Nudges</th><th>Actions</th></tr></thead>
          <tbody>${abandoned.map(c => {
            const age = (() => { const t = c.createdAt ? new Date(c.createdAt).getTime() : Date.now(); const h = (Date.now() - t) / 36e5; if (!isFinite(h)) return '—'; if (h < 1) return Math.max(0, Math.round(h * 60)) + 'm'; return Math.round(h) + 'h'; })();
            return `<tr style="opacity:${c.converted ? .5 : 1}">
            <td><b>${c.id}</b><br><small style="color:var(--ink-3)">${new Date(c.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></td>
            <td>${esc(c.phone || '—')}<br><small style="color:var(--ink-3)">${esc(c.email || '—')}</small></td>
            <td>${(c.items || []).reduce((a, i) => a + i.qty, 0)}</td>
            <td class="num"><b>${fmt(c.subtotal || 0)}</b></td>
            <td>${age}</td>
            <td>${c.converted ? '<span class="pill pm">✓ converted</span>' : `<span class="pill pf">${c.nudgeLevel || 0}/2</span>`}</td>
            <td style="white-space:nowrap">
              ${c.converted ? '' : `<button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.nudgeCart('${c.id}')">📲 Send nudge</button>`}
              <button class="btn btn-ghost btn-sm" onclick="ShivaaAdmin.convertCart('${c.id}')">✓ Converted</button>
            </td></tr>`;
          }).join('')}</tbody></table></div>` : '<p class="partner-note">No abandoned carts yet — carts are logged the moment items are left without checkout.</p>'}
      </div>`;
  }

  /* ── PAGES ── */
  if (tab === 'pages') {
    body.innerHTML = `<div class="adm-card"><h3>📄 Pages <button class="btn btn-primary btn-sm" onclick="ShivaaPages.edit()">+ New Page</button></h3>
      <p class="partner-note" style="margin-bottom:14px">Create any page yourself — Terms, About, Offers, Store Policies… It appears instantly at <b>shivaa.in/#/p/your-address</b> and in the footer. No code needed.</p>
      <div id="pgList"><div class="loading-spin"></div></div></div>`;
    ShivaaPages.load();
  }

  /* ── SETTINGS ── */
  if (tab === 'settings') {
    const S = state.settings;
    body.innerHTML = `<div class="adm-card"><h3>Store settings</h3>
      <form class="form-grid" onsubmit="ShivaaAdmin.saveSettings(event)">
        <div class="fld"><label>Phone</label><input name="phone" value="${esc(S.phone || '')}"></div>
        <div class="fld"><label>WhatsApp number (with 91, no +)</label><input name="whatsapp" value="${esc(S.whatsapp || '918905005921')}" placeholder="918905005921"></div>
        <div class="fld"><label>Email</label><input name="email" type="email" value="${esc(S.email || '')}"></div>
        <div class="fld full"><label>Address</label><input name="address" value="${esc(S.address || '')}"></div>
        <div class="fld"><label>Free shipping above ₹</label><input name="freeShipAbove" type="number" value="${S.freeShipAbove}"></div>
        <div class="fld"><label>Shipping fee ₹</label><input name="shippingFee" type="number" value="${S.shippingFee}"></div>
        <div class="fld"><label>Jaipur gold premium ₹/g</label><input name="jaipurPremium" type="number" value="${S.jaipurPremium ?? 55}"></div>
        <div class="fld"><label>Jaipur silver premium ₹/g</label><input name="jaipurSilverPremium" type="number" step="0.5" value="${S.jaipurSilverPremium ?? 3}"></div>
        <div class="fld full"><label>GST verification API key (auto-fills firm names in B2B KYC)</label><input name="gstKey" placeholder="paste key from your GST API provider — blank = verify manually at approval"></div>
        <div class="fld full"><label>Announcement ticker (one per line)</label><textarea name="announcements">${esc((S.announcements || []).join('\n'))}</textarea></div>
        <button class="btn btn-primary btn-sm" style="justify-self:start">Save settings</button>
      </form></div>
      <div class="adm-card"><h3>Online payments — Razorpay <span style="font-size:11px;color:var(--ink-3);font-weight:400">UPI, cards &amp; netbanking</span></h3>
        <div style="font-size:12.5px;color:var(--ink-3);margin:0 0 12px">Get these from <b>dashboard.razorpay.com → Settings → API Keys</b>. Save once — checkout goes live instantly. The key secret is stored server-side and is never shown to the storefront.</div>
        <div class="sum-row"><span>Status</span><b id="rzStatus" style="color:${(S.razorpay && S.razorpay.enabled) ? 'var(--ok)' : 'var(--bad)'}">${(S.razorpay && S.razorpay.enabled) ? '● Live — online checkout active' : '○ Off — checkout uses demo (no real charge)'}</b></div>
        <form class="form-grid" onsubmit="ShivaaAdmin.saveRazorpay(event)">
          <div class="fld"><label>Key ID</label><input name="rzKeyId" value="${esc((S.razorpay && S.razorpay.keyId) || '')}" placeholder="rzp_test_…" autocomplete="off"></div>
          <div class="fld"><label>Key Secret</label><input name="rzKeySecret" type="password" placeholder="•••••••• (leave blank to keep current)" autocomplete="off"></div>
          <div class="fld"><label>Mode</label><select name="rzMode"><option value="test" ${(S.razorpay && S.razorpay.mode) !== 'live' ? 'selected' : ''}>Test mode</option><option value="live" ${(S.razorpay && S.razorpay.mode) === 'live' ? 'selected' : ''}>Live mode</option></select></div>
          <button class="btn btn-primary btn-sm" style="justify-self:start">Save Razorpay</button>
        </form>
        <div id="rzMsg" style="font-size:12.5px;margin-top:10px;min-height:16px"></div>
      </div>
      <div class="adm-card"><h3>SMS &amp; OTP delivery <span style="font-size:11px;color:var(--ink-3);font-weight:400">login &amp; KYC codes</span></h3><div id="admSmsCard">Loading gateway status…</div></div>
      <div class="adm-card"><h3>Legal & registrations (read-only)</h3>
        <div class="sum-row"><span>Legal entity</span><b>${esc(S.legalName || 'Ernate Shine Jewellery Private Limited')}</b></div>
        <div class="sum-row"><span>CIN</span><b>${esc(S.cin || '')}</b></div>
        <div class="sum-row"><span>UDYAM</span><b>${esc(S.udyam || '')}</b></div>
        <div class="sum-row"><span>Startup India (DIPP)</span><b>${esc(S.dipp || '')}</b></div>
      </div>`;
    setTimeout(() => window.ShivaaAdmin && window.ShivaaAdmin.smsCard && window.ShivaaAdmin.smsCard(), 0);   // v33 — SMS status card
  }
}
window.ShivaaAdmin = {};

/* ── v33 · SMS gateway status + test sender (Settings tab) ── */
window.ShivaaAdmin.smsCard = async () => {
  const card = document.getElementById('admSmsCard');
  if (!card) return;
  try {
    const s = await api('/api/sms/status');
    const st = s.stats || {}, live = !!s.configured;
    card.innerHTML = `
      <div class="sum-row"><span>Mode</span><b style="color:${live ? '#1a7f37' : '#b45309'}">${live ? '● LIVE — real SMS via ' + esc(String(s.provider).toUpperCase()) : '● DEMO — code shown on screen, no SMS sent'}</b></div>
      <div class="sum-row"><span>Auto-fill</span><b>${s.autofill ? '“@shivaa.in #CODE” — Android auto-fills' : 'off'}</b></div>
      ${st.sent ? `<div class="sum-row"><span>Delivered</span><b>${st.ok}/${st.sent} OK${st.lastAt ? ' · last ' + esc(String(st.lastAt).replace('T', ' ').slice(0, 16)) : ''}</b></div>` : ''}
      ${st.lastErr ? `<div class="sum-row"><span>Last error</span><b style="color:#b42318;font-size:12px">${esc(st.lastErr)}</b></div>` : ''}
      <div class="kyc-inline" style="margin-top:10px">
        <input id="admSmsPhone" maxlength="10" inputmode="numeric" placeholder="10-digit mobile" style="flex:1">
        <button class="btn btn-primary btn-sm" onclick="ShivaaAdmin.smsTest(event)">Send test SMS</button>
      </div>
      <p style="font-size:12px;color:var(--ink-3);margin:8px 0 0">${live
        ? 'Send a test to your own mobile first — errors appear above after every send.'
        : 'To go live: create <b>data/sms-config.json</b> with your gateway keys (see <b>OTP-SETUP-GUIDE.md</b>). Until then codes appear on screen (demo mode).'}</p>`;
  } catch (e) { card.innerHTML = `<p style="color:var(--ink-3);font-size:13px">SMS status unavailable (${esc(e.message)})</p>`; }
};
window.ShivaaAdmin.smsTest = async e => {
  const btn = e && e.target;
  const ph = (document.getElementById('admSmsPhone') || {}).value || '';
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    const r = await api('/api/sms/test', { method: 'POST', body: JSON.stringify({ phone: ph }) });
    if (r.demoMode) toast('Demo mode — no gateway configured. Code was ' + r.devCode);
    else if (r.ok) toast('Test SMS sent ✓ — check the phone');
    else toast('Gateway error: ' + (r.error || 'unknown'), 'err');
  } catch (err) { toast(err.message, 'err'); }
  window.ShivaaAdmin.smsCard();
};

/* admin actions */
window.ShivaaAdmin.login = async e => {
  e.preventDefault();
  try {
    const fd = new FormData(e.target);
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') }) });
    window.Shivaa.setToken(r.token); state.user = r.user;
    toast('Welcome, ' + r.user.name); renderAdmin($('#view'), new URLSearchParams());
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.refreshRates = async () => {
  try { const r = await api('/api/rates/refresh', { method: 'POST' }); toast('Rates refreshed · source: ' + r.source); await window.Shivaa.state; location.reload(); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.setOverride = async e => {
  e.preventDefault();
  try {
    await api('/api/rates/override', { method: 'POST', body: JSON.stringify({ gold24: +e.target[0].value, silver: +e.target[1].value }) });
    toast('Override set — storefront now uses these rates'); location.reload();
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.clearOverride = async () => {
  try { await api('/api/rates/override', { method: 'POST', body: JSON.stringify({ clear: true }) }); toast('Override cleared — live feed restored'); location.reload(); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.setWt = async (id, val) => {
  const w = parseFloat(val);
  if (!w || w <= 0 || w > 100) return toast('Enter a sensible weight (0–100 g)', 'err');
  try {
    const r = await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({ weightG: w, weightAssumed: false }) });
    const p = state.productsCache.find(x => x.id === id);
    if (p) { p.weightG = w; p.weightAssumed = false; }
    const card = document.querySelector(`.wt-card input[data-id="${id}"]`)?.closest('.wt-card');
    if (card) { card.classList.remove('assumed'); card.querySelector('.wt-flag').textContent = '✓ saved'; }
    toast(r.sku + ' → ' + w + ' g ✓');
  } catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.saveBullion = async e => {
  e.preventDefault();
  const cash = {};
  $$('#blCashForm input[data-k]').forEach(i => { cash[i.dataset.k] = cash[i.dataset.k] || {}; cash[i.dataset.k][i.dataset.f] = +i.value; });
  try { await api('/api/bullion/cash', { method: 'PUT', body: JSON.stringify({ cash }) }); toast('Cash rates saved — jewellers notified 📈'); renderAdmin($('#view'), new URLSearchParams('tab=bullion')); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.blStatus = async (id, status) => {
  try { await api('/api/bullion/orders/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast('Order ' + id + ' → ' + status); } catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.setOrderStatus = null;
window.ShivaaAdmin.setStatus = async (id, status) => {
  try { await api('/api/orders/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast(`Order ${id} → ${status}`); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.editProduct = id => {
  const p = id ? state.productsCache.find(x => x.id === id) : { name: '', category: 'rings', metal: 'Gold', purity: '22K', weightG: 5, mcScheme: 'percent', mcValue: '', stoneValue: 0, images: ['/images/products/ring-floral.jpg'], desc: '', tags: [], sizes: [], stock: 10 };
  openModal(`
    <h3 style="font-size:24px;margin-bottom:16px">${id ? 'Edit product' : 'Add product'}</h3>
    <form class="form-grid" onsubmit="ShivaaAdmin.saveProduct(event,'${id || ''}')">
      <div class="fld full"><label>Name</label><input required value="${esc(p.name)}" name="name"></div>
      <div class="fld"><label>Category</label><select class="sortsel" style="width:100%;border-radius:12px" name="category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${p.category === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div>
      <div class="fld"><label>Metal</label><select class="sortsel" style="width:100%;border-radius:12px" name="metal"><option ${p.metal === 'Gold' ? 'selected' : ''}>Gold</option><option ${p.metal === 'Silver' ? 'selected' : ''}>Silver</option></select></div>
      <div class="fld"><label>Purity</label><select class="sortsel" style="width:100%;border-radius:12px" name="purity">${['22K', '18K', '925'].map(x => `<option ${p.purity === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="fld"><label>Weight (g)</label><input type="number" step="0.1" required value="${p.weightG}" name="weightG"></div>
      <div class="fld"><label>MC scheme</label><select class="sortsel" style="width:100%;border-radius:12px" name="mcScheme"><option value="percent" ${p.mcScheme === 'percent' ? 'selected' : ''}>% of metal value</option><option value="perGram" ${p.mcScheme === 'perGram' ? 'selected' : ''}>per gram</option><option value="flat" ${p.mcScheme === 'flat' ? 'selected' : ''}>flat</option></select></div>
      <div class="fld"><label>MC ${p.mcScheme === 'percent' ? '% (blank = you decide)' : 'value'}</label><input type="number" step="0.5" ${p.mcScheme === 'percent' ? 'placeholder="e.g. 12"' : ''} value="${p.mcScheme === 'percent' && !p._keep ? '' : p.mcValue}" ${p.mcScheme === 'percent' ? '' : 'required'} name="mcValue"></div>
      <div class="fld"><label>Stone value ₹ (0 if none)</label><input type="number" value="${p.stoneValue || 0}" name="stoneValue"></div>
      <div class="fld"><label>Stone type (B2B filter)</label><select class="sortsel" style="width:100%;border-radius:12px" name="stoneType">${['Plain','CZ','Lab-Grown Diamond','Natural Diamond','Colour Stone','Kundan/Polki'].map(s => `<option ${((p.stoneType || 'Plain') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="fld"><label>Stone colour (B2B filter)</label><select class="sortsel" style="width:100%;border-radius:12px" name="stoneColour">${['White','Colour'].map(s => `<option ${((p.stoneColour || 'White') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="fld full" style="grid-column:1/-1;background:var(--gold-faint);border:1px dashed var(--gold-soft);border-radius:12px;padding:10px 12px">
        <small style="display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7a5c17;margin-bottom:6px">B2B wholesale settlement</small>
        <div style="display:flex;gap:10px"><div style="flex:1"><label style="font-size:11px;color:var(--ink-3)">Less weight (g)</label><input type="number" step="0.01" value="${p.lessWeightG ?? 0}" name="lessWeightG"></div>
        <div style="flex:1"><label style="font-size:11px;color:var(--ink-3)">Wastage %</label><input type="number" step="0.1" value="${p.wastagePct ?? 8}" name="wastagePct"></div></div>
        <small style="font-size:10.5px;color:var(--ink-3)">Fine metal = (gross − less) × (1 − wastage%) — jewellers only</small>
      </div>
      <div class="fld"><label>Stock</label><input type="number" value="${p.stock}" name="stock"></div>
      <div class="fld full"><label>Image</label><select class="sortsel" style="width:100%;border-radius:12px" name="image">${IMG_FILES.map(f => `<option value="/images/products/${f}" ${p.images[0].endsWith(f) ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
      <div class="fld full"><label>Sizes (comma separated)</label><input value="${esc((p.sizes || []).join(', '))}" name="sizes"></div>
      <div class="fld full"><label>Tags (comma: wedding, festive, daily, gifting, mens, new, bestseller)</label><input value="${esc((p.tags || []).join(', '))}" name="tags"></div>
      <div class="fld full"><label>Description</label><textarea name="desc">${esc(p.desc)}</textarea></div>
      <button class="btn btn-primary btn-block">${id ? 'Save changes' : 'Add product'}</button>
    </form>`, 'lg');
  window._ep = p;
};
window.ShivaaAdmin.saveProduct = async (e, id) => {
  e.preventDefault();
  const f = e.target;
  const g = n => { const el = f.querySelector(`[name="${n}"]`); return el ? el.value : ''; };
  if (g('mcScheme') === 'percent' && (!g('mcValue') || +g('mcValue') <= 0 || +g('mcValue') > 60)) return toast('Enter making charges % (0-60)', 'err');
  if (!(+g('weightG') > 0)) return toast('Weight must be greater than 0', 'err');
  const body = {
    name: g('name').trim(), category: g('category'), metal: g('metal'), purity: g('purity'),
    weightG: +g('weightG'), mcScheme: g('mcScheme'), mcValue: +g('mcValue') || 0,
    stoneValue: +g('stoneValue') || 0, stoneType: g('stoneType'), stoneColour: g('stoneColour'),
    stock: +g('stock') || 0, lessWeightG: +g('lessWeightG') || 0, wastagePct: +g('wastagePct') || 0,
    images: [g('image')],
    sizes: g('sizes').split(',').map(s => s.trim()).filter(Boolean),
    tags: g('tags').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    desc: g('desc'),
  };
  try {
    if (id) await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/products', { method: 'POST', body: JSON.stringify(body) });
    toast(id ? 'Product updated' : 'Product added'); closeModal();
    await reloadProducts(); renderAdmin($('#view'), new URLSearchParams('tab=products'));
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.delProduct = async id => {
  if (!confirm('Delete this product permanently?')) return;
  try { await api('/api/products/' + id, { method: 'DELETE' }); toast('Product deleted'); await reloadProducts(); renderAdmin($('#view'), new URLSearchParams('tab=products')); }
  catch (err) { toast(err.message, 'err'); }
};
async function reloadProducts() {
  const r = await api('/api/products');
  state.productsCache = r.products; state.rates = { ...state.rates, ...r.rates };
}
window.ShivaaAdmin.saveMC = async () => {
  const table = state.mcTable.map((r, i) => {
    const row = { ...r };
    $$(`[data-i="${i}"]`).forEach(el => { row[el.dataset.f] = el.value; });
    row.value = +row.value; row.min = +row.min;
    return row;
  });
  try { await api('/api/making-charges', { method: 'PUT', body: JSON.stringify({ table }) }); state.mcTable = table; toast('Making-charges chart published ✦'); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.addMCRow = () => { state.mcTable.push({ id: 'mc' + Date.now(), category: 'New Category', purity: '22K', mode: 'perGram', value: 500, min: 400, note: '' }); renderAdmin($('#view'), new URLSearchParams('tab=mc')); };
window.ShivaaAdmin.featCat = async (id, on) => {
  try { await api('/api/catalogs/' + id, { method: 'PUT', body: JSON.stringify({ featured: on }) }); toast(on ? 'Featured' : 'Unfeatured'); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.delCat = async id => {
  if (!confirm('Delete this catalogue?')) return;
  try { await api('/api/catalogs/' + id, { method: 'DELETE' }); toast('Catalogue deleted'); renderAdmin($('#view'), new URLSearchParams('tab=catalogs')); document.dispatchEvent(new CustomEvent('catalogs:change')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.setPartner = async (id, status) => {
  try { await api('/api/partners/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast(status === 'approved' ? 'Partner approved — portal access granted ✦' : 'Application rejected'); renderAdmin($('#view'), new URLSearchParams('tab=partners')); }
  catch (e) { toast(e.message, 'err'); }
};

/* ── v30: set/reset any portal password (partners & customers) · v34: admin's own row too ── */
window.ShivaaAdmin.setUserPassword = async (btn) => {
  const uid = btn.dataset.uid || '', em = btn.dataset.em || '';
  const self = btn.dataset.admin === '1';
  openModal(`<div class="center"><h3 style="margin-bottom:6px">${self ? 'Set a new admin password' : 'Set portal password'}</h3>
    <p style="color:var(--ink-3);font-size:13px;margin-bottom:14px">${self
      ? `For <b>${esc(em)}</b> — your account. You will be signed out everywhere; sign back in with the new password.`
      : `For <b>${esc(em)}</b>. Share it privately on WhatsApp &mdash; their old sessions end immediately.`}</p>
    <form id="setPwF" class="form-grid" style="grid-template-columns:1fr">
      <div class="fld"><label>New password (min 8 characters)</label><input name="pw" type="${self ? 'password' : 'text'}" required minlength="8" autocomplete="off" placeholder="e.g. Gold@2026Safe"></div>
      ${self ? `<div class="fld"><label>Repeat the new password</label><input name="pw2" type="password" required minlength="8" autocomplete="off" placeholder="type it again — protects against a typo lockout"></div>` : ''}
      <button class="btn btn-primary btn-block">Save new password</button>
    </form></div>`);
  $('#setPwF').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pw = String(fd.get('pw') || ''), pw2 = String(fd.get('pw2') || '');
    if (self && pw !== pw2) return toast('The two passwords do not match — try again', 'err');
    try {
      let id = uid;
      if (!id) {
        const { users } = await api('/api/admin/users');
        const u = users.find(x => String(x.email).toLowerCase() === em.toLowerCase());
        if (!u) throw new Error('No user account exists with that email');
        id = u.id;
      }
      const r = await api('/api/users/' + id + '/password', { method: 'POST', body: JSON.stringify({ password: pw }) });
      toast('Password set for ' + r.email + ' ✦ — share it privately');
      closeModal();
    } catch (err) { toast(err.message, 'err'); }
  };
};
window.ShivaaAdmin.addCoupon = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  try { await api('/api/coupons', { method: 'POST', body: JSON.stringify({ code: g('code').toUpperCase(), type: g('type'), value: +g('value'), minOrder: +g('minOrder'), note: g('note') }) }); toast('Coupon created'); renderAdmin($('#view'), new URLSearchParams('tab=coupons')); }
  catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.saveSettings = async e => {
  e.preventDefault();
  // read by name — positional indexing silently corrupts settings if a field moves
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  try {
    const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ phone: g('phone'), whatsapp: g('whatsapp').replace(/\D/g, ''), email: g('email'), address: g('address'), freeShipAbove: +g('freeShipAbove'), shippingFee: +g('shippingFee'), jaipurPremium: +g('jaipurPremium'), jaipurSilverPremium: +g('jaipurSilverPremium'), gstApi: { key: g('gstKey').trim() }, announcements: g('announcements').split('\n').filter(Boolean) }) });
    Object.assign(state.settings, s); toast('Settings saved');
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaAdmin.saveRazorpay = async e => {
  e.preventDefault();
  const fd = new FormData(e.target); const g = k => String(fd.get(k) || '');
  // build with only what was typed; server preserves the existing secret if blank
  const payload = { key_id: g('rzKeyId').trim(), key_secret: g('rzKeySecret'), mode: g('rzMode') === 'live' ? 'live' : 'test' };
  try {
    const s = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ razorpay: payload }) });
    Object.assign(state.settings, s);
    const msg = $('#rzMsg'); const st = $('#rzStatus');
    const on = s.razorpay && s.razorpay.enabled;
    if (st) { st.style.color = on ? 'var(--ok)' : 'var(--bad)'; st.textContent = on ? '● Live — online checkout active' : '○ Off — checkout uses demo (no real charge)'; }
    if (msg) { msg.style.color = 'var(--ok)'; msg.textContent = on ? '✓ Razorpay saved & live. Test a checkout with a UPI/card to confirm.' : 'Saved. Enter both Key ID & Key Secret to turn online payments on.'; }
  } catch (err) { const msg = $('#rzMsg'); if (msg) { msg.style.color = 'var(--bad)'; msg.textContent = err.message; } }
};

/* ── v41 · review moderation ── */
window.ShivaaAdmin.moderateReview = async (id, status) => {
  try { await api('/api/reviews/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); toast('Review ' + status); renderAdmin($('#view'), new URLSearchParams('tab=reviews')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.toggleVerified = async (id, verified) => {
  try { await api('/api/reviews/' + id, { method: 'PUT', body: JSON.stringify({ verified }) }); toast(verified ? 'Marked as verified buyer' : 'Verified badge removed'); renderAdmin($('#view'), new URLSearchParams('tab=reviews')); }
  catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.delReview = async id => {
  if (!confirm('Delete this review permanently?')) return;
  try { await api('/api/reviews/' + id, { method: 'DELETE' }); toast('Review deleted'); renderAdmin($('#view'), new URLSearchParams('tab=reviews')); }
  catch (e) { toast(e.message, 'err'); }
};

/* ── v41 · abandoned-cart recovery ── */
const NUDGE_MSG = c => {
  const line = (c.items || []).map(i => `• ${i.name} × ${i.qty}`).join('\n');
  return `Namaste Shivaa ✦\n\nYou added a few pieces to your cart but didn't finalise:\n\n${line}\n\nStill saved on shivaa.in — would you like to complete the order or ask me a question?\n\nI can hold these for you.`;
};
window.ShivaaAdmin.nudgeCart = async id => {
  const c = (window.ShivaaAdmin._abandoned || []).find(x => x.id === id);
  try {
    const r = await api('/api/cart-abandon/' + id, { method: 'POST', body: JSON.stringify({}) });
    if (c && c.phone) {
      const wa = 'https://wa.me/' + String(c.phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '') + '?text=' + encodeURIComponent(NUDGE_MSG(c));
      openModal(`<div class="center"><h3 style="margin-bottom:6px">Nudge ${r.level}/2 sent</h3>
        <p style="font-size:13px;color:var(--ink-2);margin-bottom:14px">The WhatsApp chat below is pre-filled. In production your <b>1h / 24h</b> cron hits this endpoint to send it automatically.</p>
        <a class="btn btn-gold btn-block" target="_blank" rel="noopener" href="${wa}">Open WhatsApp nudge to ${esc(c.phone)} →</a>
        <button class="btn btn-ghost btn-block mt-2" onclick="Shivaa.closeModal()">Done</button></div>`);
    } else toast('Nudge ' + r.level + '/2 logged — no phone on this cart, so send via email or skip.');
    renderAdmin($('#view'), new URLSearchParams('tab=carts'));
  } catch (e) { toast(e.message, 'err'); }
};
window.ShivaaAdmin.convertCart = async id => {
  try { await api('/api/cart-abandon/' + id, { method: 'POST', body: JSON.stringify({ action: 'converted' }) }); toast('Marked converted'); renderAdmin($('#view'), new URLSearchParams('tab=carts')); }
  catch (e) { toast(e.message, 'err'); }
};
function drawBarChart(cv, days) {
  if (!cv || !days.length) { if (cv) cv.parentElement.innerHTML += '<p style="color:var(--ink-3);font-size:13px">Revenue chart appears once orders come in.</p>'; return; }
  const x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.parentElement.clientWidth, h = 260;
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = { l: 60, r: 10, t: 10, b: 40 };
  const max = Math.max(...days.map(d => d[1])) * 1.15 || 1;
  const bw = Math.min(48, (w - pad.l - pad.r) / days.length * 0.62);
  days.forEach((d, i) => {
    const bx = pad.l + (i + 0.5) * (w - pad.l - pad.r) / days.length;
    const bh = d[1] / max * (h - pad.t - pad.b);
    const g = x.createLinearGradient(0, h - pad.b - bh, 0, h - pad.b);
    g.addColorStop(0, '#d4af5a'); g.addColorStop(1, '#6e1e2a');
    x.fillStyle = g;
    x.beginPath(); x.roundRect(bx - bw / 2, h - pad.b - bh, bw, bh, 5); x.fill();
    x.fillStyle = '#8a7d6c'; x.font = '10px Jost'; x.textAlign = 'center';
    x.fillText(d[0].slice(5), bx, h - pad.b + 16);
  });
  x.strokeStyle = '#eee3cd'; x.fillStyle = '#8a7d6c'; x.font = '10.5px Jost'; x.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const val = max * i / 3, y = h - pad.b - (i / 3) * (h - pad.t - pad.b);
    x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke();
    x.fillText(val >= 100000 ? (val / 100000).toFixed(1) + 'L' : Math.round(val / 1000) + 'k', pad.l - 8, y + 4);
  }
}

/* ════════════════ PARTNER PORTAL ════════════════ */
async function renderPartner(view) {
  if (!state.user) {
    view.innerHTML = `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:30px">
      <div class="adm-card" style="max-width:460px;width:100%">
        <div class="center"><img src="/images/logo.png" style="height:44px;margin:0 auto 12px"><h3 style="margin-bottom:4px">Partner Portal</h3><p style="font-size:13px;color:var(--ink-3)">For approved B2B partner jewellers</p></div>
        <form class="form-grid" style="grid-template-columns:1fr;margin-top:16px" onsubmit="ShivaaAdmin.partnerLogin(event)">
          <div class="fld"><label>Email</label><input name="email" type="email" autocomplete="username" required placeholder="you@yourfirm.in"></div>
          <div class="fld"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-primary btn-block">Sign in</button>
        </form>
        <p style="font-size:12.5px;color:var(--ink-3);margin-top:12px;text-align:center">New here? <a href="#/b2b" style="color:var(--gold)">Apply for partnership →</a></p>
      </div></div>`;
    return;
  }
  let data;
  try { data = await api('/api/partners/me'); }
  catch (e) {
    // v31 — if the session died (reload wiped storage, token expired, db
    // restored), show the portal sign-in — never a bare API error.
    if (!state.user) { renderPartner(view); return; }
    view.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3><a class="btn btn-primary" href="#/b2b" style="margin-top:14px">Go to the B2B page</a></div>`;
    return;
  }
  const { partner, settlements } = data;
  const sales = settlements.map(s => s.sales);
  const totals = {
    lifetime: sales.reduce((a, b) => a + b, 0),
    last: sales[sales.length - 1] || 0,
    nextPayout: settlements.find(s => s.status.includes('Processing'))?.payout || settlements[settlements.length - 1]?.payout || 0,
  };
  view.innerHTML = `
  <div class="admin-shell">
    <aside class="adm-side">
      <div class="adm-logo"><img src="/images/logo.png" alt=""><div><b style="font-family:var(--ff-disp);font-size:17px">${esc(partner?.firm || 'Partner')}</b><br><small style="font-size:10px;letter-spacing:.2em;opacity:.7">PARTNER PORTAL</small></div></div>
      <nav class="adm-nav">
        <a href="#/partner" class="on">&#9672; Dashboard</a>
        <a href="#/metal" class="nav-mtl">&#9670; Metal Investment</a>
        <a href="#/catalogues" class="nav-ds">&#10022; Design Selection</a>
        <a href="#/partner?view=bullion">&#129351; Bullion Desk</a>
        <a href="#/deadstock">&#9634; Dead Stock Purchase</a>
        <a href="#/partner?view=reports">&#9646; Reports</a>
        <a href="#/" style="margin-top:14px">&larr; Storefront</a>
      </nav>
    </aside>
    <main class="adm-main">
      <div class="adm-head"><h2>Namaste, ${esc(partner?.contactPerson || partner?.firm || 'Partner')}</h2>
        <span class="src-badge src-live"><span class="live-dot"></span>Gold 22K ${fmt(state.rates?.gold22 || 0)}/g</span></div>
      <!-- ══ PRIMARY HIGHLIGHT · METAL INVESTMENT SCHEME ══ -->
      <a class="mtl-prime" href="#/metal" data-sec="dash">
        <div class="mp-glow" aria-hidden="true"></div>
        <div class="mp-dust" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="mp-inner">
          <div class="mp-left">
            <span class="mp-kicker">&#9670; PARTNERS ONLY &middot; FLAGSHIP FACILITY</span>
            <h3>Metal Investment <em>Scheme</em></h3>
            <p>Your idle gold is earning nothing in the locker. Deposit it with Shivaa and earn a fixed <b>1% every month</b> &mdash; taken in metal or in cash, entirely your choice.</p>
            <div class="mp-pills">
              <span class="mp-pill mp-pill-hero"><b>1%</b> per month</span>
              <span class="mp-pill"><b>12%</b> per year</span>
              <span class="mp-pill">100% insured custody</span>
            </div>
            <span class="mp-cta">Open the investment desk <i>&rarr;</i></span>
          </div>
          <div class="mp-right">
            <div class="mp-ring" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle class="mpr-bg" cx="60" cy="60" r="52"></circle>
                <circle class="mpr-fg" cx="60" cy="60" r="52"></circle>
              </svg>
              <div class="mp-ring-tx"><b>12<small>%</small></b><small>a year</small></div>
            </div>
            <div class="mp-bars" aria-hidden="true">
              <i style="--h:34%;--d:0ms"></i><i style="--h:52%;--d:90ms"></i>
              <i style="--h:70%;--d:180ms"></i><i style="--h:100%;--d:270ms"></i>
            </div>
          </div>
        </div>
      </a>

      <div class="ds-hero" data-sec="dash">
        <span class="k">Your order desk</span>
        <h3>&#10022; Design Selection &amp; Billing</h3>
        <p>Browse today&rsquo;s designs, select what your counter needs, and settle in <b>fine gold grams</b> &mdash; zero making charges. This is where your orders begin.</p>
        <div class="ds-hero-row">
          <a class="btn btn-gold btn-lg" href="#/catalogues">Open Design Selection &rarr;</a>
          <span class="ds-pill">&#10022; ${state.productsCache.length}+ live designs</span>
          <span class="ds-pill">&#9878; Fine-metal settlement</span>
          <span class="ds-pill">&#8377; Zero making charges</span>
        </div>
      </div>
      <a class="ds-second" href="#/deadstock" data-sec="dash">
        <span class="dsx-ic" aria-hidden="true">&#9634;</span>
        <span class="dsx-tx">
          <b>Dead Stock Purchase &mdash; 22K in, fine metal out</b>
          <small>Hand over slow-moving 22K jewellery at one wastage; half your making charges come back as melting-loss protection.</small>
        </span>
        <span class="dsx-go" aria-hidden="true">&rarr;</span>
      </a>

      <div class="stat-grid" data-sec="dash">
        <div class="stat"><small>Lifetime sales</small><b>${fmt(totals.lifetime)}</b><span>${settlements.length} weeks</span></div>
        <div class="stat"><small>Last week sales</small><b>${fmt(totals.last)}</b><span>${settlements[settlements.length - 1]?.orders || 0} orders</span></div>
        <div class="stat"><small>Next payout</small><b>${fmt(totals.nextPayout)}</b><span>settles Friday ✓</span></div>
        <div class="stat"><small>Partner since</small><b style="font-size:22px">${partner?.joined ? new Date(partner.joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</b><span>${esc(partner?.city || '')}</span></div>
      </div>
      <div class="adm-card bullion-card" data-sec="bullion">
        <h3>🥇 Bullion Rates <span class="bl-live"><span class="live-dot"></span>LIVE · <span id="blDate"></span></span>
          <button class="btn btn-ghost btn-sm" onclick="ShivaaBullion.refresh()">↻ Refresh</button></h3>
        <div id="bullionRows" class="bl-rows"><div class="loading-spin"></div></div>
        <p class="partner-note" style="margin-top:12px">RTGS rates auto-update from the international bullion feed · CASH rates are set by Shivaa and any change notifies you here instantly. Tap BUY / SELL to place a bullion order.</p>
        <div class="sec-title" style="margin-top:16px">My bullion orders</div>
        <div id="blOrders"></div>
      </div>

      <div class="pco-prime aurora" data-sec="dash">
        <div class="pco-head">
          <div><span class="pco-kicker">Signature Desk</span><h3>✦ Place Customer Order</h3>
          <p>Order a bespoke piece for your walk-in customer — design photo, melting &amp; advance in one privileged form.</p></div>
          <div class="pco-orn">✦</div>
        </div>
        <form id="coForm" class="form-grid" onsubmit="ShivaaCO.place(event)">
          <div class="fld"><label>Product name *</label><input id="coName" required placeholder="e.g. Kundan cocktail ring"></div>
          <div class="fld"><label>Weight wanted (grams) *</label><input id="coWeight" type="number" step="0.01" min="0.5" required placeholder="e.g. 6.5"></div>
          <div class="fld"><label>Melting wanted (grams)</label><input id="coMelt" type="number" step="0.01" min="0" placeholder="e.g. 0.15"></div>
          <div class="fld"><label>Advance willing to give (₹)</label><input id="coAdv" type="number" min="0" placeholder="e.g. 25000"></div>
          <div class="fld"><label>Size</label><input id="coSize" placeholder="e.g. 16 / 2.4"></div>
          <div class="fld full"><label>Note (optional)</label><input id="coNote" placeholder="delivery date, finish, reference…"></div>
          <div class="fld full">
            <label>Design image (from your phone/gallery)</label>
            <div class="drop-zone" id="coDrop" style="padding:22px">
              <div style="font-size:26px;margin-bottom:4px">📷</div>
              <b id="coDropTxt">Tap to choose design photo</b><br><small>JPG/PNG up to 8 MB</small>
              <input type="file" id="coFile" accept="image/*" hidden>
            </div>
          </div>
          <button class="btn btn-primary" style="grid-column:1/-1;justify-self:start">Place Custom Order</button>
        </form>
      </div>
      <div class="adm-card" data-sec="dash"><h3>My metal orders (design selection)</h3><div id="mxOrders"><div class="loading-spin"></div></div></div>
      <div class="grid2" data-sec="dash">
        <div class="adm-card"><h3>Stock request</h3>
          <form class="form-grid" onsubmit="ShivaaPartner.stockReq(event)">
            <div class="fld full"><label>What do you need this month?</label><textarea required placeholder="e.g. 2kg 22K chains, 15 bridal sets, silver payal 40 pairs…"></textarea></div>
            <button class="btn btn-primary btn-sm" style="grid-column:1/-1;justify-self:start">Send request</button>
          </form><p style="font-size:12px;color:var(--ink-3);margin-top:8px">Monthly stock meetings: last Saturday, 5 PM at Jayal or on call.</p></div>
        <div class="adm-card"><h3>Your manager</h3>
          <div class="benefit"><div class="bic">☎</div><div><b>Karan Soni — Executive Director</b><p>Direct line for stock, rates & settlements: <b>${esc(state.settings.phone)}</b></p></div></div>
          <div class="benefit"><div class="bic">&#10022;</div><div><b>Daily designs on WhatsApp</b><p>New designs every morning &mdash; then select and bill them in <a href="#/catalogues" style="color:var(--gold)">Design Selection</a>.</p></div></div>
        </div>
      </div>
    </main>
  </div>`;
  // ── view switching: dashboard | bullion | reports ──
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const vw = q.get('view') || 'dash';
  const show = sel => $$('[data-sec]').forEach(el => { el.style.display = sel.includes(el.dataset.sec) ? '' : 'none'; });
  if (vw === 'bullion')      show(['bullion']);
  else if (vw === 'reports') show([]);
  else                       show(['dash', 'bullion']);
  $$('.adm-nav a').forEach(x => {
    const h = x.getAttribute('href');
    // #/metal and #/deadstock are their own routes — never lit from ?view=
    if (h && h.indexOf('#/partner') !== 0) { x.classList.remove('on'); return; }
    x.classList.toggle('on', h === (vw === 'dash' ? '#/partner' : '#/partner?view=' + vw));
  });
  if (vw === 'bullion') {
    $('.adm-head h2').textContent = 'Bullion Desk';
  }
  if (vw === 'reports') {
    const main = $('.adm-main');
    main.insertAdjacentHTML('beforeend', `
      <div class="adm-card"><h3>&#9646; Weekly Sales</h3><canvas id="ptChart"></canvas></div>
      <div class="adm-card"><h3>Payment settlements <span style="font-size:12px;color:var(--ink-3);font-weight:400">— every Friday with the sales report</span></h3>
        <div class="adm-table-wrap"><table class="adm-table settle-table">
          <thead><tr><th>Week ending</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">Payout</th><th>Status</th></tr></thead>
          <tbody>${settlements.slice().reverse().map(s => `<tr>
            <td>${s.weekEnding}</td><td class="num">${s.orders}</td>
            <td class="num"><b>${fmt(s.sales)}</b></td><td class="num">${fmt(s.payout)}</td>
            <td><span class="status-pill ${s.status === 'Paid' ? 'st-delivered' : 'st-packed'}">${esc(s.status)}</span></td>
          </tr>`).join('')}</tbody>
        </table></div></div>`);
  }
  const cv = $('#ptChart');
  if (cv) drawBarChart(cv, settlements.map(s => [s.weekEnding.slice(5), s.sales]));
  if (window.ShivaaBullion) ShivaaBullion.startPolling();
  if (window.ShivaaCO) { ShivaaCO.init(); ShivaaCO.loadMine(); }
}
window.ShivaaAdmin.partnerLogin = async e => {
  e.preventDefault();
  try {
    const fd = new FormData(e.target);
    const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') }) });
    window.Shivaa.setToken(r.token); state.user = r.user;
    toast('Welcome, ' + r.user.name); renderPartner($('#view'));
  } catch (err) { toast(err.message, 'err'); }
};
window.ShivaaPartner = {
  stockReq: async e => {
    e.preventDefault();
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: state.user.name, phone: state.user.phone || '', message: '[STOCK REQUEST] ' + e.target[0].value }) });
      toast('Stock request sent — your manager will confirm ✦'); e.target.reset();
    } catch (err) { toast(err.message, 'err'); }
  },
};

/* ───── owner page manager ───── */
window.ShivaaPages = {
  cache: [],
  async load() {
    const el = document.getElementById('pgList'); if (!el) return;
    try {
      const admin = state.user.role === 'admin';
      let list = this.cache;
      if (admin) {
        // admin needs drafts too — fetch via list + individual is overkill; server returns published only. We keep our own cache of created ones.
      }
      el.innerHTML = list.length ? list.map(pg => `
        <div class="pg-row">
          <div><b>${esc(pg.title)}</b><small>shivaa.in/#/p/${pg.slug} · updated ${new Date(pg.updatedAt).toLocaleDateString('en-IN')}${pg.published === false ? ' · <span style="color:var(--warn)">draft</span>' : ''}</small></div>
          <div class="pg-actions">
            <a class="btn btn-ghost btn-sm" href="#/p/${pg.slug}" target="_blank">View</a>
            <button class="btn btn-outline btn-sm" onclick='ShivaaPages.edit(${JSON.stringify(pg).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--bad)" onclick="ShivaaPages.del('${pg.slug}')">Delete</button>
          </div>
        </div>`).join('') : '<p class="partner-note">No pages yet — create your first one (e.g. "Terms of Use", "Return Policy", "Our Story").</p>';
    } catch (e) { el.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
  },
  edit(pg) {
    pg = pg || { title: '', slug: '', body: '', published: true };
    openModal(`
      <h3 style="font-size:22px;margin-bottom:14px">${pg.slug ? 'Edit' : 'New'} Page</h3>
      <form class="form-grid" onsubmit="ShivaaPages.save(event,'${pg.slug || ''}')">
        <div class="fld full"><label>Page title *</label><input id="pgTitle" required value="${esc(pg.title)}" placeholder="e.g. Return & Exchange Policy"></div>
        <div class="fld full"><label>Web address (myshop.in/#/p/<b>this</b>) *</label><input id="pgSlug" required value="${esc(pg.slug)}" placeholder="e.g. return-policy" ${pg.slug ? 'readonly' : ''}></div>
        <div class="fld full"><label>Content — blank line = new paragraph, single Enter = line break (HTML is shown as text, kept safe)</label>
          <textarea id="pgBody" rows="12" style="min-height:220px" placeholder="Write your page here…">${esc(pg.body || '')}</textarea></div>
        <div class="fld full" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="pgPub" ${pg.published !== false ? 'checked' : ''} style="accent-color:var(--gold);width:17px;height:17px"><label for="pgPub" style="margin:0">Published (visible to visitors)</label></div>
        <button class="btn btn-primary btn-block">💾 Save Page</button>
      </form>`, 'lg');
  },
  async save(e, origSlug) {
    e.preventDefault();
    const body = {
      title: document.getElementById('pgTitle').value,
      slug: origSlug || document.getElementById('pgSlug').value,
      body: document.getElementById('pgBody').value,
      published: document.getElementById('pgPub').checked,
    };
    try {
      const r = origSlug
        ? await api('/api/pages/' + origSlug, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/api/pages', { method: 'POST', body: JSON.stringify(body) });
      this.cache = this.cache.filter(x => x.slug !== r.slug);
      if (r.published !== false || origSlug) this.cache.push(r);
      closeModal(); toast('Page saved ✦ live at #/p/' + r.slug);
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  },
  async del(slug) {
    if (!confirm('Delete this page?')) return;
    try { await api('/api/pages/' + slug, { method: 'DELETE' }); this.cache = this.cache.filter(x => x.slug !== slug); toast('Page deleted'); this.load(); }
    catch (e) { toast(e.message, 'err'); }
  },
};

/* ───── custom design orders (partner) ───── */
window.ShivaaCO = {
  file: null,
  init() {
    const drop = document.getElementById('coDrop'), input = document.getElementById('coFile');
    if (!drop || drop._wired) return; drop._wired = true;
    drop.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) { this.file = input.files[0]; document.getElementById('coDropTxt').textContent = '✓ ' + this.file.name; } };
    ['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault();
      drop.classList.toggle('drag', ev === 'dragover');
      if (ev === 'drop' && e.dataTransfer.files[0]) { this.file = e.dataTransfer.files[0]; document.getElementById('coDropTxt').textContent = '✓ ' + this.file.name; }
    }));
  },
  async place(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', document.getElementById('coName').value);
    fd.append('weight', document.getElementById('coWeight').value);
    fd.append('melting', document.getElementById('coMelt').value || 0);
    fd.append('advance', document.getElementById('coAdv').value || 0);
    fd.append('size', document.getElementById('coSize').value);
    fd.append('note', document.getElementById('coNote').value);
    if (this.file) fd.append('design', this.file);
    try {
      const res = await fetch('/api/customorder', { method: 'POST', headers: token() ? { Authorization: 'Bearer ' + token() } : {}, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast('Custom order ' + data.id + ' placed ✦');
      e.target.reset(); this.file = null; document.getElementById('coDropTxt').textContent = 'Tap to choose design photo';
      this.loadMine();
    } catch (err) { toast(err.message, 'err'); }
  },
  async loadMine() {
    const el = document.getElementById('mxOrders'); if (!el) return;
    try {
      const [mx, co] = await Promise.all([api('/api/metalexchange/orders'), api('/api/customorder')]);
      el.innerHTML =
        (mx.orders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Designs</th><th class="num">Weight</th><th class="num">Fine @99.50</th><th>MC</th><th>Status</th></tr></thead><tbody>${mx.orders.map(o => `<tr><td><b>${o.id}</b><br><small style="color:var(--ink-3)">${new Date(o.createdAt).toLocaleDateString('en-IN')}</small></td><td>${o.items.length}</td><td class="num">${o.totalWeightG} g</td><td class="num"><b>${o.fineGrams} g</b></td><td>₹0</td><td>${o.status}</td></tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No metal orders — select designs from Catalogues → Design Selection.</p>')
        + (co.orders.length ? `<div class="sec-title" style="margin-top:16px">Custom orders</div><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Design</th><th class="num">Weight</th><th class="num">Advance</th><th>Size</th><th>Status</th></tr></thead><tbody>${co.orders.map(o => `<tr><td><b>${o.id}</b></td><td>${esc(o.name)}${o.designImg ? ` <a href="${o.designImg}" target="_blank">🖼</a>` : ''}</td><td class="num">${o.weightG} g</td><td class="num">${o.advance ? fmt(o.advance) : '—'}</td><td>${esc(o.size || '—')}</td><td>${o.status}</td></tr>`).join('')}</tbody></table></div>` : '');
    } catch (e) { el.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
  },
};

/* ─────────────────────────────────────────────
   BULLION mini-app (partner portal + admin)
   ───────────────────────────────────────────── */
window.ShivaaBullion = {
  lastSeen: null,
  async refresh(silent = true) {
    try {
      const B = await window.Shivaa.api('/api/bullion');
      this.lastSeen = this.lastSeen || B.updatedAt;
      if (!silent && B.updatedAt !== this.lastSeen) {
        this.lastSeen = B.updatedAt;
        window.Shivaa.toast('📈 Bullion rates updated — showing fresh prices');
      } else if (B.updatedAt !== this.lastSeen) {
        this.lastSeen = B.updatedAt;
        window.Shivaa.toast('📈 Bullion CASH rates updated by Shivaa');
      }
      this.render(B);
    } catch (e) { const el = document.getElementById('bullionRows'); if (el) el.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
  },
  render(B) {
    const dEl = document.getElementById('blDate'); if (dEl) dEl.textContent = B.date;
    const el = document.getElementById('bullionRows'); if (!el) return;
    const chgTxt = c => c > 0 ? `<i class="bl-chg up">▲ +${c}</i>` : c < 0 ? `<i class="bl-chg down">▼ ${c}</i>` : '<i class="bl-chg flat">— 0</i>';
    el.innerHTML = B.rows.map(r => `
      <div class="bl-row ${r.mode.toLowerCase()}">
        <div class="bl-id"><b>${r.label}</b><small>${r.purity} · ${r.mode}${r.editable ? ' <em>(Shivaa set)</em>' : ''} · ${chgTxt(r.change)}</small></div>
        <div class="bl-btns">
          <div class="bl-rate"><small>BUY</small><b>₹${r.buy.toLocaleString('en-IN')}</b></div>
          <button class="bl-buy" onclick='ShivaaBullion.orderForm(${JSON.stringify({ key: r.key, label: r.label, mode: r.mode, side: "buy", rate: r.buy, purity: r.purity })})'>BUY</button>
          <div class="bl-rate"><small>SELL</small><b>₹${r.sell.toLocaleString('en-IN')}</b></div>
          <button class="bl-sell" onclick='ShivaaBullion.orderForm(${JSON.stringify({ key: r.key, label: r.label, mode: r.mode, side: "sell", rate: r.sell, purity: r.purity })})'>SELL</button>
        </div>
      </div>`).join('');
    this.loadOrders();
  },
  orderForm(o) {
    window.Shivaa.openModal(`
      <h3 style="font-size:22px;margin-bottom:2px">${o.side === 'buy' ? 'Buy' : 'Sell'} — ${o.label}</h3>
      <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px">${o.purity} · ${o.mode} · rate locked ₹${o.rate.toLocaleString('en-IN')}/g now</div>
      <form class="form-grid" onsubmit="ShivaaBullion.place(event)">
        <input type="hidden" id="boKey" value="${o.key}"><input type="hidden" id="boSide" value="${o.side}">
        <input type="hidden" id="boMetal" value="${o.label}">
        <div class="fld"><label>Quantity *</label><input id="boQty" type="number" step="0.01" min="0.01" required placeholder="e.g. 2.5"></div>
        <div class="fld"><label>Unit</label><select id="boUnit" class="sortsel" style="width:100%;border-radius:12px"><option value="kg">Kg</option><option value="g">Grams</option></select></div>
        <div class="fld full"><label>Note (optional)</label><input id="boNote" placeholder="delivery date, payment mode…"></div>
        <div class="fld full" style="background:var(--gold-faint);border-radius:12px;padding:12px 14px;font-size:13px">Est. value: <b id="boEst" style="color:var(--maroon)">—</b> <span style="color:var(--ink-3)">(qty × ₹${o.rate.toLocaleString('en-IN')}/g)</span></div>
        <button class="btn btn-primary btn-block">Place ${o.side === 'buy' ? 'Buy' : 'Sell'} Order</button>
      </form>`);
    const est = () => { const q = +document.getElementById('boQty').value || 0; const u = document.getElementById('boUnit').value; document.getElementById('boEst').textContent = '₹' + Math.round(q * o.rate * (u === 'kg' ? 1000 : 1)).toLocaleString('en-IN'); };
    document.getElementById('boQty').oninput = est; document.getElementById('boUnit').onchange = est;
  },
  async place(e) {
    e.preventDefault();
    try {
      const ord = await window.Shivaa.api('/api/bullion/order', { method: 'POST', body: JSON.stringify({
        side: document.getElementById('boSide').value, metKey: document.getElementById('boKey').value,
        metal: document.getElementById('boMetal').value, qty: +document.getElementById('boQty').value,
        unit: document.getElementById('boUnit').value, note: document.getElementById('boNote').value,
      }) });
      window.Shivaa.closeModal();
      window.Shivaa.toast('Order ' + ord.id + ' placed ✦ our team will confirm on call/WhatsApp');
      const msg = encodeURIComponent('✦ SHIVAA BULLION ORDER ✦\n\n' + (ord.side === 'buy' ? 'BUY' : 'SELL') + ' — ' + ord.metal + '\nQty: ' + ord.qty + ' ' + ord.unit + ' @ ₹' + ord.rate.toLocaleString('en-IN') + '/g\nEst. value: ₹' + ord.amount.toLocaleString('en-IN') + '\nOrder: ' + ord.id + (ord.note ? '\nNote: ' + ord.note : '') + '\n\nPlease confirm.');
      window.Shivaa.openModal(`<div class="center"><div style="font-size:40px">✦</div><h3 style="margin:8px 0">Order ${ord.id} placed!</h3><p style="font-size:13.5px;color:var(--ink-2)">${ord.side === 'buy' ? 'Buying' : 'Selling'} ${ord.qty} ${ord.unit} ${ord.metal} @ ₹${ord.rate.toLocaleString('en-IN')}/g<br>Est. ₹${ord.amount.toLocaleString('en-IN')}</p><a class="btn btn-gold" style="margin-top:14px" target="_blank" rel="noopener" href="https://wa.me/918905005921?text=${msg}">Confirm on WhatsApp →</a></div>`);
      this.loadOrders();
    } catch (err) { window.Shivaa.toast(err.message, 'err'); }
  },
  async loadOrders() {
    const el = document.getElementById('blOrders'); if (!el) return;
    try {
      const { orders } = await window.Shivaa.api('/api/bullion/orders');
      el.innerHTML = orders.length ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>ID</th><th>Side</th><th>Metal</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>${orders.map(o => `<tr><td><b>${o.id}</b><br><small style="color:var(--ink-3)">${new Date(o.createdAt).toLocaleDateString('en-IN')}</small></td><td><span class="status-pill ${o.side === 'buy' ? 'st-placed' : 'st-packed'}">${o.side}</span></td><td>${o.metal.split('—')[0]}</td><td class="num">${o.qty} ${o.unit}</td><td class="num">₹${o.rate.toLocaleString('en-IN')}</td><td class="num"><b>₹${o.amount.toLocaleString('en-IN')}</b></td><td>${o.status}</td></tr>`).join('')}</tbody></table></div>` : '<p class="partner-note">No bullion orders yet — tap BUY/SELL on any rate above.</p>';
    } catch (e) { el.innerHTML = '<p class="partner-note">' + e.message + '</p>'; }
  },
  startPolling() {
    clearInterval(window._blPoll);
    this.refresh(false);
    window._blPoll = setInterval(() => this.refresh(false), 45000);
  },
};

/* register routes */
window.Shivaa.routes.admin = renderAdmin;
window.Shivaa.routes.partner = renderPartner;
})();
